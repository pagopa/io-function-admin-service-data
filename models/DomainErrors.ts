import { ErrorResponse as ApimErrorResponse } from "@azure/arm-apimanagement";

export interface IApimSubError {
  readonly kind: "apimsuberror";
  readonly message: string;
}

export interface IApimUserError {
  readonly kind: "apimusererror";
  readonly message: string;
}

export const toApimSubError = (message: string): IApimSubError => ({
  kind: "apimsuberror",
  message
});

export const toApimUserError = (message: string): IApimUserError => ({
  kind: "apimusererror",
  message
});

export type DomainError = IApimSubError | IApimUserError;

export const toString = (err: DomainError): string =>
  `${err.kind}|${err.message}`;

export const toApimSubErrorMessage = ({
  statusCode: code,
  message
}: ApimErrorResponse & {
  readonly statusCode?: number;
}): string => {
  switch (code) {
    case 400:
      return `Invalid Subscription Id|${code}|${message}`;
    case 404:
      return `Subscription not found|${code}|${message}`;
    default:
      return `APIM Generic error|${code || "no-code-returned"}|${message}`;
  }
};
