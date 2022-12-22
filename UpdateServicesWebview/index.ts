import { AzureFunction } from "@azure/functions";
import { getConfigOrThrow } from "../utils/config";
import getPool from "../utils/db";
import { initTelemetryClient } from "../utils/appinsight";
import { UpdateServicesWebview } from "./handler";

const config = getConfigOrThrow();

// Setup PostgreSQL DB Pool
const pool = getPool(config);

// Setup Appinsight
const telemetryClient = initTelemetryClient(config);

const index: AzureFunction = UpdateServicesWebview({
  config,
  pool,
  telemetryClient
});

export default index;
