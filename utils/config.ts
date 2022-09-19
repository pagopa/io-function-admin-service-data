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
import {
  IntegerFromString,
  NumberFromString
} from "@pagopa/ts-commons/lib/numbers";

// Environment configuration to connect to IO CosmosDB
//   needed in order to fetch changes on Services collection
export type IDecodableConfigCosmosDB = t.TypeOf<
  typeof IDecodableConfigCosmosDB
>;
export const IDecodableConfigCosmosDB = t.interface({
  COSMOSDB_CONNECTIONSTRING: NonEmptyString,
  COSMOSDB_KEY: NonEmptyString,
  COSMOSDB_NAME: NonEmptyString,
  COSMOSDB_SERVICES_COLLECTION: NonEmptyString,
  COSMOSDB_SERVICES_LEASE_COLLECTION: NonEmptyString,
  COSMOSDB_URI: NonEmptyString
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

// Environment configuration to connect to Application Insight instance
//   needed in order to monitoring basic events and custom events
export type IDecodableConfigAppInsight = t.TypeOf<
  typeof IDecodableConfigAppInsight
>;
export const IDecodableConfigAppInsight = t.intersection([
  t.interface({
    APPINSIGHTS_INSTRUMENTATIONKEY: NonEmptyString
  }),
  t.partial({
    APPINSIGHTS_DISABLE: NonEmptyString,
    APPINSIGHTS_SAMPLING_PERCENTAGE: withDefault(IntegerFromString, 5)
  })
]);

export type IConfig = t.TypeOf<typeof IConfig>;
export const IConfig = t.intersection([
  IDecodableConfigCosmosDB,
  IDecodableConfigAPIM,
  IDecodableConfigPostgreSQL,
  IDecodableConfigAppInsight,
  t.interface({
    // default function app storage connection
    AzureWebJobsStorage: NonEmptyString,

    INTERNAL_STORAGE_CONNECTION_STRING: NonEmptyString,
    QUEUE_ADD_SERVICE_TO_MIGRATIONS: NonEmptyString,

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
