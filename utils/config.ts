/**
 * Config module
 *
 * Single point of access for the application confguration. Handles validation on required environment variables.
 * The configuration is evaluate eagerly at the first access to the module. The module exposes convenient methods to access such value.
 */

import * as t from "io-ts";

import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";

import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { withDefault } from "@pagopa/ts-commons/lib/types";
import { NumberFromString } from "@pagopa/ts-commons/lib/numbers";

// Environment configuration to connect to dedicate db instance
//   needed in order to persist migration data
export type IDecodableConfigPostgreSQL = t.TypeOf<
  typeof IDecodableConfigPostgreSQL
>;
export const IDecodableConfigPostgreSQL = t.interface({
  DB_HOST: NonEmptyString,
  DB_IDLE_TIMEOUT: withDefault(NumberFromString, 30000),
  DB_NAME: NonEmptyString,
  DB_PASSWORD: NonEmptyString,
  DB_PORT: NumberFromString,
  DB_SCHEMA: NonEmptyString,
  DB_TABLE: NonEmptyString,
  DB_USER: NonEmptyString
});

// Environment configuration to connect to IO APIM instance
//   needed in order to query API Subscription Keys
export type IDecodableConfigAPIM = t.TypeOf<typeof IDecodableConfigAPIM>;
export const IDecodableConfigAPIM = t.interface({
  APIM_CLIENT_ID: NonEmptyString,
  APIM_RESOURCE_GROUP: NonEmptyString,
  APIM_SECRET: NonEmptyString,
  APIM_SERVICE_NAME: NonEmptyString,
  APIM_SUBSCRIPTION_ID: NonEmptyString,
  APIM_TENANT_ID: NonEmptyString
});

// global app configuration
export type IConfig = t.TypeOf<typeof IConfig>;
// eslint-disable-next-line @typescript-eslint/ban-types

export const IConfig = t.intersection([
  IDecodableConfigPostgreSQL,
  IDecodableConfigAPIM,
  t.interface({
    AzureWebJobsStorage: NonEmptyString,

    COSMOSDB_KEY: NonEmptyString,
    COSMOSDB_NAME: NonEmptyString,
    COSMOSDB_URI: NonEmptyString,

    isProduction: t.boolean
  })
]);

export const envConfig = {
  ...process.env,
  isProduction: process.env.NODE_ENV === "production"
};

// No need to re-evaluate this object for each call
const errorOrConfig: t.Validation<IConfig> = IConfig.decode(envConfig);

/**
 * Read the application configuration and check for invalid values.
 * Configuration is eagerly evalued when the application starts.
 *
 * @returns either the configuration values or a list of validation errors
 */
export const getConfig = (): t.Validation<IConfig> => errorOrConfig;

/**
 * Read the application configuration and check for invalid values.
 * If the application is not valid, raises an exception.
 *
 * @returns the configuration values
 * @throws validation errors found while parsing the application configuration
 */
export const getConfigOrThrow = (): IConfig =>
  pipe(
    errorOrConfig,
    E.getOrElseW((errors: ReadonlyArray<t.ValidationError>) => {
      throw new Error(`Invalid configuration: ${readableReport(errors)}`);
    })
  );
