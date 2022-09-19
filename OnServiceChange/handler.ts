import { ErrorResponse as ApimErrorResponse } from "@azure/arm-apimanagement";
import { flow, pipe } from "fp-ts/lib/function";
import { Pool, QueryResult } from "pg";
import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as TE from "fp-ts/lib/TaskEither";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { RetrievedService } from "@pagopa/io-functions-commons/dist/src/models/service";
import knex from "knex";
import {
  ApimSubscriptionResponse,
  ApimUserResponse,
  ApimDelegateUserResponse,
  IApimConfig
} from "../models/DomainApim";
import { MigrationRowDataTable } from "../models/Domain";
import { IConfig, IDecodableConfigPostgreSQL } from "../utils/config";
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
APIM return an ownerId with a format like this one:
/subscriptions/subid/resourceGroups/resourceGroupName/providers/Microsoft.ApiManagement/service/apimServiceName/users/00000000000000000000000000
and we need the latest digits to get a cleaner ownerId
*/

export const parseOwnerIdFullPath = (
  fullPath: NonEmptyString
): O.Option<NonEmptyString> =>
  pipe(
    fullPath,
    f => f.split("/"),
    O.fromPredicate(a => a.length === 11),
    O.chain(
      flow(
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
    readonly apimUser: ApimDelegateUserResponse;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): TE.TaskEither<DomainError, QueryResult | void> =>
  pipe(
    retrievedDocument.serviceId,
    // given the subscription, retrieve it's apim object
    /*
    TaskEither<IApimSubError, { ownerId: string & INonEmptyStringTag; subscriptionId: string & TaskEither<IApimUserError | IDbError, { ownerId: string & INonEmptyStringTag; subscriptionId: string & INonEmptyStringTag; }>'.
    */
    id => getApimOwnerIdBySubscriptionId(apimClient, id),
    TE.chainW(apimSubscription =>
      pipe(
        // given the subscription apim object, retrieve its owner's detail
        getApimUserBySubscriptionResponse(apimClient, apimSubscription),
        // We only consider subscription owned by a Delegate,
        //   otherwise we just ignore the document
        // This because migration are meant to work only from a Delegate to its Organization,
        //   not to migrate subscriptions between organizations
        TE.chainW(apimUser =>
          ApimDelegateUserResponse.is(apimUser)
            ? // continue processing incoming document
              pipe(
                { apimSubscription, apimUser },
                apimData => mapDataToTableRow(retrievedDocument, apimData),
                createUpsertSql(config),
                sql => queryDataTable(pool, sql),
                TE.mapLeft(err => toPostgreSQLError(err.message))
              )
            : // processing is successful, just ignore the document
              TE.of(void 0)
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

/*
const handler = async (_documents: unknown): Promise<IResponseErrorInternal> =>
  pipe(
    TE.throwError<string, IResponseErrorInternal>("To be implemented"),
    TE.mapLeft(ResponseErrorInternal),
    TE.toUnion
  )();
*/

export const handler = (
  config: IConfig,
  apimClient: IApimConfig,
  pool: Pool
) => (document: RetrievedService): Promise<void> =>
  pipe(
    document,
    storeDocumentApimToDatabase(apimClient, config, pool),
    TE.map(_ => void 0 /* we expect no return */),
    // let the handler fail
    TE.getOrElse(err => {
      throw err;
    })
  )();

export default handler;
