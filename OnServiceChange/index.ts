import getPool from "../utils/db";
import { getApiClient } from "../utils/apim";
import { getConfigOrThrow } from "../utils/config";
import { initTelemetryClient } from "../utils/appinsight";
import OnServiceChangeHandler from "./handler";

const config = getConfigOrThrow();

// Setup PostgreSQL DB Pool
const pool = getPool(config);
const apimClient = getApiClient(
  {
    clientId: config.APIM_CLIENT_ID,
    secret: config.APIM_SECRET,
    tenantId: config.APIM_TENANT_ID
  },
  config.APIM_SUBSCRIPTION_ID
);

// Setup Appinsight
const telemetryClient = initTelemetryClient(config);

const handleServicesChange = OnServiceChangeHandler(telemetryClient)(
  config,
  {
    client: apimClient,
    config
  },
  pool
);

export default handleServicesChange;
