import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "@pagopa/ts-commons/lib/request_middleware";
import * as express from "express";
import {
  IResponseErrorForbiddenNotAuthorized,
  IResponseErrorInternal,
  IResponseErrorValidation,
  IResponseSuccessJson,
  ResponseErrorInternal,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";
import { RequiredParamMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_param";
import {
  EmailString,
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { Context } from "@azure/functions";
import knex from "knex";
import { Pool } from "pg";
import * as TE from "fp-ts/lib/TaskEither";
import { flow, pipe } from "fp-ts/lib/function";
import { IConfig, IDecodableConfigPostgreSQL } from "../utils/config";
import { ServicesSearchList } from "../generated/definitions/ServicesSearchList";
import { ServiceSearchResultSet } from "../models/Domain";
import {
  IDbError,
  toPostgreSQLError,
  toPostgreSQLErrorMessage
} from "../models/DomainErrors";
import { queryDataTable } from "../utils/db";

type GetServicesSearchListHandler = (
  context: Context,
  organizationFiscalCode: OrganizationFiscalCode,
  delegate_email: EmailString
) => Promise<
  | IResponseSuccessJson<ServicesSearchList>
  | IResponseErrorInternal
  | IResponseErrorForbiddenNotAuthorized
  | IResponseErrorValidation
>;

export const createSqlServices = (dbConfig: IDecodableConfigPostgreSQL) => (
  delegateEmail: EmailString,
  organizationFiscalCode: OrganizationFiscalCode
): NonEmptyString =>
  knex({
    client: "pg"
  })
    .withSchema(dbConfig.DB_SCHEMA)
    .table(dbConfig.DB_TABLE)
    .select(["serviceId", "serviceName", "isVisible"])
    .where({
      DelegateEmail: delegateEmail,
      OrganizationFiscalCode: organizationFiscalCode
    })
    .toQuery() as NonEmptyString;

export const getServices = (config: IConfig, connect: Pool) => (
  delegateEmail: EmailString,
  organizationFiscalCode: OrganizationFiscalCode
): TE.TaskEither<IDbError, ServiceSearchResultSet> =>
  pipe(
    createSqlServices(config)(delegateEmail, organizationFiscalCode),
    sql => queryDataTable(connect, sql),
    TE.mapLeft(flow(toPostgreSQLErrorMessage, toPostgreSQLError))
  );

export const processResponseFromResultSet = (
  resultSet: ServiceSearchResultSet
): TE.TaskEither<
  IResponseErrorInternal,
  IResponseSuccessJson<ServicesSearchList>
> =>
  pipe(
    resultSet,
    TE.of,
    TE.mapLeft(() => ResponseErrorInternal("Error on decode")),
    TE.map(data => ResponseSuccessJson(data.rows))
  );

const GetServicesSearchListHandler = (): GetServicesSearchListHandler => async (
  context: Context,
  organizationFiscalCode: OrganizationFiscalCode,
  delegate_email: EmailString
): Promise<
  | IResponseSuccessJson<ServicesSearchList>
  | IResponseErrorInternal
  | IResponseErrorForbiddenNotAuthorized
  | IResponseErrorValidation
> => {
  context.log(
    `Starting Status for: ${organizationFiscalCode} ${delegate_email}`
  );
  return Promise.resolve(ResponseErrorInternal("Not implemented yet!"));
};

export const Handler = (): express.RequestHandler => {
  const handler = GetServicesSearchListHandler();
  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredParamMiddleware("organizationFiscalCode", OrganizationFiscalCode),
    RequiredParamMiddleware("delegate_email", EmailString)
  );
  return wrapRequestHandler(middlewaresWrap(handler));
};
