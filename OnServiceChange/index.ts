import { Context } from "@azure/functions";

import { RetrievedService } from "@pagopa/io-functions-commons/dist/src/models/service";
import { getConfigOrThrow } from "../utils/config";
import getPool from "../utils/db";
import { getApiClient } from "../utils/apim";
import { handler } from "./handler";

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

const run = async (
  _context: Context,
  document: RetrievedService
): Promise<void> =>
  handler(
    config,
    {
      client: apimClient,
      config
    },
    pool
  )(document);
export default run;
