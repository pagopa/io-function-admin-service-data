import { Context } from "@azure/functions";
import { ServiceScopeEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/ServiceScope";
import { ServiceScope } from "@pagopa/io-functions-commons/dist/generated/definitions/ServiceScope";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";
import * as TE from "fp-ts/TaskEither";
import { Pool, PoolClient } from "pg";
import * as Cursor from "pg-cursor";
import { withDefault } from "@pagopa/ts-commons/lib/types";
import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { IConfig } from "../utils/config";
import { initTelemetryClient } from "../utils/appinsight";

export const ServiceRecord = t.intersection([
  t.interface({
    id: NonEmptyString,
    name: NonEmptyString,
    organizationFiscalCode: OrganizationFiscalCode,
    organizationName: NonEmptyString,
    quality: t.number,
    scope: withDefault(ServiceScope, ServiceScopeEnum.NATIONAL)
  }),
  t.partial({
    description: NonEmptyString
  })
]);
export type ServiceRecord = t.TypeOf<typeof ServiceRecord>;
type Services = ReadonlyMap<
  ServiceRecord["organizationFiscalCode"],
  ReadonlyArray<ServiceRecord>
>;

interface ICompactService {
  // Service Id
  readonly i: string;
  // Service name
  readonly n: string;
  // Quality flag, can be 1 or 0.
  // 0. required quality level not reached
  // 1. quality level reached
  readonly q: number;
}
type CompactServices = ReadonlyArray<Organization<ICompactService>>;

interface IExtendedService extends ICompactService {
  // Service scope
  readonly sc: ServiceScopeEnum;
  // Service description
  readonly d?: string;
}
type ExtendedServices = ReadonlyArray<IOrganization<IExtendedService>>;

interface IOrganization<T extends ICompactService> {
  // Organization Fiscal Code
  readonly fc: string;
  // Organization Name
  readonly o: string;
  // Organization services
  readonly s: ReadonlyArray<T>;
}

const createSQL = (): string =>
  `SELECT id, name, quality, scope, description, organizationFiscalCode, organizationName FROM <table> WHERE isVisible is true`;
const createCursor = (pgClient: PoolClient) => (sql: string): Cursor =>
  pgClient.query(new Cursor(sql));

const fetchAllData = (cursor: Cursor): TE.TaskEither<Error, Services> => {
  throw "not implemented yet";
};

const formatCompactServices = (services: Services): CompactServices => {
  throw "not implemented yet";
};

const formatExtendedServices = (services: Services): ExtendedServices => {
  throw "not implemented yet";
};

const writeCompact = (context: Context) => (obj: Services): void => {
  pipe(obj, formatCompactServices, JSON.stringify, serialized => {
    // eslint-disable-next-line functional/immutable-data
    context.bindings.visibleServicesCompact = serialized;
  });
};

const writeExtended = (context: Context) => (obj: Services): void => {
  pipe(obj, formatExtendedServices, JSON.stringify, serialized => {
    // eslint-disable-next-line functional/immutable-data
    context.bindings.visibleServicesExtended = serialized;
  });
};

export const UpdateServicesWebview = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  { SERVICE_QUALITY_EXCLUSION_LIST }: IConfig,
  pool: Pool,
  _telemetryClient: ReturnType<typeof initTelemetryClient>
) => async (context: Context): Promise<void> => {
  const client = await pool.connect();
  const procedure = pipe(
    createSQL(),
    createCursor(client),
    fetchAllData,
    TE.map(services => {
      writeCompact(context)(services);
      writeExtended(context)(services);
    }),
    TE.getOrElse(error => {
      throw error;
    })
  );
  return procedure();
};
