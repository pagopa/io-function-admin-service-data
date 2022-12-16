import { flow, pipe } from "fp-ts/lib/function";
import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import * as RA from "fp-ts/lib/ReadonlyArray";
import knex from "knex";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import {
  RetrievedService,
  ValidService
} from "@pagopa/io-functions-commons/dist/src/models/service";
import { ErrorResponse as ApimErrorResponse } from "@azure/arm-apimanagement";
import { Pool, QueryResult } from "pg";
import { Context } from "@azure/functions";
import { ServiceRowDataTable } from "../models/Domain";
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
import { initTelemetryClient } from "../utils/appinsight";
import {
  trackFailApimUserBySubscriptionResponse,
  trackFailDecode,
  trackGenericError
} from "../utils/tracking";

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
  apimSubscriptionResponse: ApimSubscriptionResponse,
  telemetryClient: ReturnType<typeof initTelemetryClient>
): TE.TaskEither<IApimUserError, ApimUserResponse> =>
  pipe(
    TE.tryCatch(
      () =>
        apim.client.user.get(
          apim.config.APIM_RESOURCE_GROUP,
          apim.config.APIM_SERVICE_NAME,
          apimSubscriptionResponse.ownerId
        ),
      () => {
        trackFailApimUserBySubscriptionResponse(telemetryClient)(
          apimSubscriptionResponse.ownerId,
          "Error on retrieve APIM User by Subscription Response" as NonEmptyString,
          apimSubscriptionResponse.subscriptionId
        );
        return toApimUserError(
          "The provided subscription identifier is malformed or invalid or occur an Authetication Error."
        );
      }
    ),
    TE.chain(
      flow(
        ApimUserResponse.decode,
        TE.fromEither,
        TE.mapLeft(() => {
          trackFailDecode(telemetryClient)("Error on Decode User Response");
          return toApimUserError("Invalid Apim User Response Decode.");
        })
      )
    )
  );

export const mapDataToTableRow = (
  retrievedDocument: RetrievedService,
  quality: number,
  apimData: {
    readonly apimUser: ApimUserResponse;
    readonly apimSubscription: ApimSubscriptionResponse;
  }
): ServiceRowDataTable => ({
  departmentName: retrievedDocument.departmentName,
  description: retrievedDocument.serviceMetadata?.description,
  id: retrievedDocument.serviceId,
  isVisible: retrievedDocument.isVisible,
  maxAllowedPaymentAmount: retrievedDocument.maxAllowedPaymentAmount,
  name: retrievedDocument.serviceName,
  organizationFiscalCode: retrievedDocument.organizationFiscalCode,
  organizationName: retrievedDocument.organizationName,
  quality,
  requireSecureChannels: retrievedDocument.requireSecureChannels,
  scope: retrievedDocument.serviceMetadata?.scope as NonEmptyString,
  serviceMetadata: retrievedDocument.serviceMetadata,
  subscriptionAccountEmail: apimData.apimUser.email,
  subscriptionAccountId: apimData.apimSubscription.ownerId,
  subscriptionAccountName: apimData.apimUser.firstName,
  subscriptionAccountSurname: apimData.apimUser.lastName,
  version: retrievedDocument.version
});

export const createUpsertSql = (dbConfig: IDecodableConfigPostgreSQL) => (
  data: ServiceRowDataTable
): NonEmptyString =>
  knex({
    client: "pg"
  })
    .withSchema(dbConfig.DB_SCHEMA)
    .table(dbConfig.DB_TABLE)
    .insert(data)
    .onConflict("id")
    .merge([
      "authorizedCIDRS",
      "departmentName",
      "description",
      "isVisible",
      "maxAllowedPaymentAmount",
      "name",
      "organizationFiscalCode",
      "organizationName",
      "quality",
      "scope",
      "serviceMetadata",
      "subscriptionAccountEmail",
      "subscriptionAccountId",
      "subscriptionAccountName",
      "subscriptionAccountSurname",
      "version"
    ])
    .whereRaw(`"${dbConfig.DB_TABLE}"."version" < excluded."version"`)
    .toQuery() as NonEmptyString;

const isSubscriptionNotFound = (err: DomainError): boolean =>
  err.kind === "apimsuberror" &&
  err.message.startsWith("Subscription not found");

export const getQuality = (retrievedDocument: RetrievedService): number =>
  pipe(
    ValidService.decode(retrievedDocument),
    E.fold(
      _ => 0, // quality ko
      _ => 1 // quality ok
    )
  );

export const storeDocumentApimToDatabase = (
  apimClient: IApimConfig,
  config: IConfig,
  pool: Pool,
  telemetryClient: ReturnType<typeof initTelemetryClient>
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
        getApimUserBySubscriptionResponse(
          apimClient,
          apimSubscription,
          telemetryClient
        ),
        TE.map(apimUser => ({
          apimUser,
          quality: getQuality(retrievedDocument)
        })),
        TE.chainW(({ apimUser, quality }) =>
          pipe(
            { apimSubscription, apimUser },
            apimData => mapDataToTableRow(retrievedDocument, quality, apimData),
            createUpsertSql(config),
            sql => queryDataTable(pool, sql),
            TE.mapLeft(err => {
              trackGenericError(telemetryClient)(
                "Error on query database",
                err.message
              );
              return toPostgreSQLError(err.message);
            })
          )
        )
      )
    ),
    // check errors to see if we might fail or just ignore current document
    TE.foldW(err => {
      // There are Services in database that have no related Subscription.
      // It's an inconsistent state and should not be present;
      //  however, for Services of early days of IO it may happen as we still have Services created when IO was just a proof-of-concepts
      // We choose to just skip such documents
      if (isSubscriptionNotFound(err)) {
        return TE.of(void 0);
      } else {
        trackGenericError(telemetryClient)(
          "Error on inconsistent service",
          err.message
        );
        return TE.left(err);
      }
    }, TE.of)
  );

const handler = (
  config: IConfig,
  apimClient: IApimConfig,
  pool: Pool,
  telemetryClient: ReturnType<typeof initTelemetryClient>
) => async (document: RetrievedService): Promise<void> =>
  pipe(
    document,
    storeDocumentApimToDatabase(apimClient, config, pool, telemetryClient),
    TE.map(_ => void 0 /* we expect no return */),
    // let the handler fail
    TE.getOrElse(err => {
      trackGenericError(telemetryClient)("Error on handler", err.message);
      throw err;
    })
  )();

const OnServiceChangeHandler = (
  telemetryClient: ReturnType<typeof initTelemetryClient>
) => (config: IConfig, apimClient: IApimConfig, pool: Pool) => async (
  context: Context,
  documents: ReadonlyArray<RetrievedService>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> =>
  pipe(
    Array.isArray(documents) ? documents : [documents],
    RA.map(d => handler(config, apimClient, pool, telemetryClient)(d))
  );

export default OnServiceChangeHandler;
