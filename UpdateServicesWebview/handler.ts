import { Context } from "@azure/functions";
import { ServiceScopeEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/ServiceScope";
import { ServiceScope } from "@pagopa/io-functions-commons/dist/generated/definitions/ServiceScope";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";
import * as TE from "fp-ts/TaskEither";
import * as O from "fp-ts/Option";
import * as E from "fp-ts/Either";
import { Pool, PoolClient } from "pg";
import * as Cursor from "pg-cursor";
import knexBase from "knex";
import { withDefault } from "@pagopa/ts-commons/lib/types";
import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { toError } from "fp-ts/lib/Either";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import { IConfig, IDecodableConfigPostgreSQL } from "../utils/config";
import { initTelemetryClient } from "../utils/appinsight";

const knex = knexBase({
  client: "pg"
});

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
// eslint-disable-next-line functional/prefer-readonly-type -- This map is used as accumulator
type Services = Map<
  ServiceRecord["organizationFiscalCode"],
  // eslint-disable-next-line functional/prefer-readonly-type -- Service record is used as accumulator
  ServiceRecord[]
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
// eslint-disable-next-line functional/prefer-readonly-type -- This array is used as accumulator
type CompactServices = Array<IOrganization<ICompactService>>;

interface IExtendedService extends ICompactService {
  // Service scope
  readonly sc: ServiceScopeEnum;
  // Service description
  readonly d?: string;
}
// eslint-disable-next-line functional/prefer-readonly-type -- This array is used as accumulator
type ExtendedServices = Array<IOrganization<IExtendedService>>;

interface IOrganization<T extends ICompactService> {
  // Organization Fiscal Code
  readonly fc: string;
  // Organization Name
  readonly o: string;
  // Organization services
  readonly s: ReadonlyArray<T>;
}

const createSQL = ({
  DB_SCHEMA,
  DB_TABLE
}: IDecodableConfigPostgreSQL): string =>
  knex
    .withSchema(DB_SCHEMA)
    .table(DB_TABLE)
    .select([
      "id",
      "name",
      "quality",
      "scope",
      "description",
      "organizationFiscalCode",
      "organizationName"
    ])
    .where(knex.raw(`"isVisible" is true`))
    .orderBy("updateAt", "asc")
    .toQuery();

const createCursor = (pgClient: PoolClient) => (sql: string): Cursor =>
  pgClient.query(new Cursor(sql));

const formatCompactServices = (services: Services): CompactServices => {
  const compactServices: CompactServices = [];
  services.forEach((serviceRecords, organizationFiscalCode) => {
    // eslint-disable-next-line functional/immutable-data
    compactServices.push({
      fc: organizationFiscalCode,
      o: serviceRecords[0].organizationName,
      s: serviceRecords.map(serviceRecord => ({
        i: serviceRecord.id.trim(),
        n: serviceRecord.name,
        q: serviceRecord.quality
      }))
    });
  });

  return compactServices;
};

const formatExtendedServices = (services: Services): ExtendedServices => {
  const extendedServices: ExtendedServices = [];
  services.forEach((serviceRecords, organizationFiscalCode) => {
    // eslint-disable-next-line functional/immutable-data
    extendedServices.push({
      fc: organizationFiscalCode,
      o: serviceRecords[0].organizationName,
      s: serviceRecords.map(serviceRecord => ({
        d: serviceRecord.description,
        i: serviceRecord.id.trim(),
        n: serviceRecord.name,
        q: serviceRecord.quality,
        sc: serviceRecord.scope
      }))
    });
  });

  return extendedServices;
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

const appendService = (
  services: Services,
  serviceRecord: ServiceRecord
): Services =>
  pipe(
    services.get(serviceRecord.organizationFiscalCode),
    O.fromNullable,
    O.fold(
      () => {
        services.set(serviceRecord.organizationFiscalCode, [serviceRecord]);
      },
      s => {
        // eslint-disable-next-line functional/immutable-data
        s.push(serviceRecord);
      }
    ),
    _ => services
  );

const binaryOperator = (
  accumulator: Services,
  currentValue: unknown
): Services =>
  pipe(
    currentValue,
    ServiceRecord.decode,
    E.fold(
      error => {
        // eslint-disable-next-line no-console
        console.log(readableReport(error));
        return accumulator;
      },
      serviceRecord => appendService(accumulator, serviceRecord)
    )
  );

export const fetchAllData = (pageSize: number) => (
  cursor: Cursor
): TE.TaskEither<Error, Services> =>
  TE.tryCatch(async () => {
    const services = new Map() as Services;
    // eslint-disable-next-line functional/no-let
    let length: number = pageSize;
    while (length === pageSize) {
      try {
        const rows = await cursor.read(pageSize);
        length = rows.length;
        rows.reduce(binaryOperator, services);
      } catch (ex) {
        throw toError(ex);
      }
    }
    return services;
  }, toError);

interface IHandlerParameters {
  readonly config: IConfig;
  readonly pool: Pool;
  readonly pageSize?: number;
  readonly telemetryClient: ReturnType<typeof initTelemetryClient>;
}
export const UpdateServicesWebview = ({
  config,
  pool,
  pageSize = 1000
}: IHandlerParameters) => async (context: Context): Promise<void> => {
  const client = await pool.connect();
  const procedure = pipe(
    createSQL(config),
    createCursor(client),
    fetchAllData(pageSize),
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
