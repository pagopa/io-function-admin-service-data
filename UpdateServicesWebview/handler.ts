import { Context } from "@azure/functions";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import { Pool, PoolClient } from "pg";
import * as Cursor from "pg-cursor";
import { IConfig } from "../utils/config";
import { initTelemetryClient } from "../utils/appinsight";

interface ServiceRecord {
  readonly id: string;
}
type Services = ReadonlyMap<ServiceRecord["id"], ServiceRecord>;
interface CompactServices {}
interface ExtendedServices {}

const createSQL = (): string => ``;
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
