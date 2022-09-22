import { pipe } from "fp-ts/lib/function";
import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import * as T from "fp-ts/lib/Task";
import * as RA from "fp-ts/lib/ReadonlyArray";
import { Context } from "@azure/functions";
import knex from "knex";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { RetrievedService } from "@pagopa/io-functions-commons/dist/src/models/service";
import { MigrationRowDataTable } from "../models/Domain";
import { IDecodableConfigPostgreSQL } from "../utils/config";
import {
  ApimDelegateUserResponse,
  ApimSubscriptionResponse
} from "../models/DomainApim";

type Handler = () => Promise<void>;

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

// TO DO: This is the Handler and it's to be implemented!
const handler = (): Handler =>
  pipe(
    T.of(void 0),
    T.map(_ => void 0)
  );

const OnServiceChangeHandler = () => (
  _context: Context,
  _documents: ReadonlyArray<unknown>
): Handler => pipe(handler());

export default OnServiceChangeHandler;
