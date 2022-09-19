import { ErrorResponse as ApimErrorResponse } from "@azure/arm-apimanagement";

import { DatabaseError } from "pg";

export interface IDbError {
  readonly kind: "dberror";
  readonly message?: string;
}

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

export const toPostgreSQLError = (message: string): IDbError => ({
  kind: "dberror",
  message
});

export type DomainError = IDbError | IApimSubError | IApimUserError;

export const toString = (err: DomainError): string =>
  `${err.kind}|${err.message}`;

export const toPostgreSQLErrorMessage = ({
  code,
  message,
  detail
}: DatabaseError): string => {
  switch (code) {
    case "23505":
      return `Duplicate Primary Key|${code}|${message}|${detail}`;
    case "42P00":
      return `Table not found|${code}|${message}|${detail}`;
    default:
      return `DB Generic Error|${code ||
        "no-code-returned"}|${message}|${detail}`;
  }
};

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
