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

/*
To-Do:
  1. Pass PostgreSQL connection pool
  2. Pass Insight Application for troubleshooting
*/
const index: AzureFunction = UpdateServicesWebview(
  config,
  pool,
  telemetryClient
);

export default index;
