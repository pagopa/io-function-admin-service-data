import { flow, pipe } from "fp-ts/lib/function";
import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import * as RA from "fp-ts/lib/ReadonlyArray";
import knex from "knex";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { RetrievedService } from "@pagopa/io-functions-commons/dist/src/models/service";
import { ErrorResponse as ApimErrorResponse } from "@azure/arm-apimanagement";
import { Pool, QueryResult } from "pg";
import { MigrationRowDataTable } from "../models/Domain";
import { IConfig, IDecodableConfigPostgreSQL } from "../utils/config";
import {
  ApimSubscriptionResponse,
  ApimUserResponse,
  IApimConfig
} from "../models/DomainApim";
import {
  DomainError,
  IApimSubError,
  IApimUserError,
  toApimSubError,
  toApimSubErrorMessage,
  toApimUserError,
  toPostgreSQLError
} from "../models/DomainErrors";
import { queryDataTable } from "../utils/db";

/*
 ** The right full path for ownerID is in this kind of format:
 ** "/subscriptions/subid/resourceGroups/{resourceGroup}/providers/Microsoft.ApiManagement/service/{apimService}/users/5931a75ae4bbd512a88c680b",
 ** resouce link: https://docs.microsoft.com/en-us/rest/api/apimanagement/current-ga/subscription/get
 */
export const parseOwnerIdFullPath = (
  fullPath: NonEmptyString
): O.Option<NonEmptyString> =>
  pipe(
    fullPath,
    f => f.split("/"),
    O.fromPredicate(a => a.length === 11),
    O.chain(splittedPath =>
      pipe(
        splittedPath,
        RA.last,
        O.chain(s => {
          const decoded = NonEmptyString.decode(s);
          return E.isRight(decoded) ? O.some(decoded.right) : O.none;
        })
      )
    )
  );

export const getApimOwnerIdBySubscriptionId = (
  apim: IApimConfig,
  subscriptionId: NonEmptyString
): TE.TaskEither<IApimSubError, ApimSubscriptionResponse> =>
  pipe(
    TE.tryCatch(
      () =>
        apim.client.subscription.get(
          apim.config.APIM_RESOURCE_GROUP,
          apim.config.APIM_SERVICE_NAME,
          subscriptionId
        ),
      error =>
        error as ApimErrorResponse & {
          readonly statusCode?: number;
        }
    ),

    TE.mapLeft(flow(toApimSubErrorMessage, toApimSubError)),

    TE.chain(subscriptionGetResponse =>
      flow(
        NonEmptyString.decode,
        E.mapLeft(_ => toApimSubError("Invalid Owner Id.")),
        E.map(parseOwnerIdFullPath),
        E.chainW(
          E.fromOption(() => toApimSubError("Invalid Owner Id Full Path."))
        ),
        TE.fromEither
      )(subscriptionGetResponse.ownerId)
    ),

    TE.map(ownerId => ({
      ownerId,
      subscriptionId
    }))
  );

export const getApimUserBySubscriptionResponse = (
  apim: IApimConfig,
  apimSubscriptionResponse: ApimSubscriptionResponse
): TE.TaskEither<IApimUserError, ApimUserResponse> =>
  pipe(
    TE.tryCatch(
      () =>
        apim.client.user.get(
          apim.config.APIM_RESOURCE_GROUP,
          apim.config.APIM_SERVICE_NAME,
          apimSubscriptionResponse.ownerId
        ),
      () =>
        toApimUserError(
          "The provided subscription identifier is malformed or invalid or occur an Authetication Error."
        )
    ),
    TE.chain(
      flow(
        ApimUserResponse.decode,
        TE.fromEither,
        TE.mapLeft(() => toApimUserError("Invalid Apim User Response Decode."))
      )
    )
  );

export const mapDataToTableRow = (
  retrievedDocument: RetrievedService,
  apimData: {
    readonly apimUser: ApimUserResponse;
    readonly apimSubscription: ApimSubscriptionResponse;
  }
): MigrationRowDataTable => ({
  isVisible: retrievedDocument.isVisible,
  organizationFiscalCode: retrievedDocument.organizationFiscalCode,
  serviceName: retrievedDocument.serviceName || "",
  serviceVersion: retrievedDocument.version,
  sourceEmail: apimData.apimUser.email,
  sourceId: apimData.apimSubscription.ownerId,
  sourceName: apimData.apimUser.firstName,
  sourceSurname: apimData.apimUser.lastName,
  subscriptionId: retrievedDocument.serviceId
});

export const createUpsertSql = (dbConfig: IDecodableConfigPostgreSQL) => (
  data: MigrationRowDataTable
): NonEmptyString =>
  knex({
    client: "pg"
  })
    .withSchema(dbConfig.DB_SCHEMA)
    .table(dbConfig.DB_TABLE)
    .insert(data)
    .onConflict("subscriptionId")
    .merge(["organizationFiscalCode", "serviceVersion", "serviceName"])
    .whereRaw(
      `"${dbConfig.DB_TABLE}"."serviceVersion" < excluded."serviceVersion"`
    )
    .toQuery() as NonEmptyString;

const isSubscriptionNotFound = (err: DomainError): boolean =>
  err.kind === "apimsuberror" &&
  err.message.startsWith("Subscription not found");

export const storeDocumentApimToDatabase = (
  apimClient: IApimConfig,
  config: IConfig,
  pool: Pool
) => (
  retrievedDocument: RetrievedService
): TE.TaskEither<DomainError, QueryResult | void> =>
  pipe(
    retrievedDocument.serviceId,
    // given the subscription, retrieve it's apim object
    id => getApimOwnerIdBySubscriptionId(apimClient, id),
    TE.chainW(apimSubscription =>
      pipe(
        // given the subscription apim object, retrieve its owner's detail
        getApimUserBySubscriptionResponse(apimClient, apimSubscription),
        TE.chainW(apimUser =>
          pipe(
            { apimSubscription, apimUser },
            apimData => mapDataToTableRow(retrievedDocument, apimData),
            createUpsertSql(config),
            sql => queryDataTable(pool, sql),
            TE.mapLeft(err => toPostgreSQLError(err.message))
          )
        )
      )
    ),
    // check errors to see if we might fail or just ignore curretn document
    TE.foldW(err => {
      // There are Services in database that have no related Subscription.
      // It's an inconsistent state and should not be present;
      //  however, for Services of early days of IO it may happen as we still have Services created when IO was just a proof-of-concepts
      // We choose to just skip such documents
      if (isSubscriptionNotFound(err)) {
        return TE.of(void 0);
      } else {
        return TE.left(err);
      }
    }, TE.of)
  );

const handler = (
  config: IConfig,
  apimClient: IApimConfig,
  pool: Pool
) => async (document: RetrievedService): Promise<void> =>
  pipe(
    document,
    storeDocumentApimToDatabase(apimClient, config, pool),
    TE.map(_ => void 0 /* we expect no return */),
    // let the handler fail
    TE.getOrElse(err => {
      throw err;
    })
  )();

const OnServiceChangeHandler = (
  config: IConfig,
  apimClient: IApimConfig,
  pool: Pool
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => async (documents: ReadonlyArray<RetrievedService>): Promise<any> =>
  pipe(
    Array.isArray(documents) ? documents : [documents],
    RA.map(d => handler(config, apimClient, pool)(d))
  );

export default OnServiceChangeHandler;
