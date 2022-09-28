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
  ResponseErrorInternal
} from "@pagopa/ts-commons/lib/responses";
import { RequiredParamMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_param";
import {
  EmailString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { Context } from "@azure/functions";
import { ServicesSearchList } from "../models/Domain";

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
