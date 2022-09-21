import { pipe } from "fp-ts/lib/function";
import * as T from "fp-ts/lib/Task";
import { Context } from "@azure/functions";
import knex from "knex";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { MigrationRowDataTable } from "../models/Domain";
import { IDecodableConfigPostgreSQL } from "../utils/config";

type Handler = () => Promise<void>;

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
