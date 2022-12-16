import { AzureFunction } from "@azure/functions";
import { getConfigOrThrow } from "../utils/config";
import { UpdateServicesWebview } from "./handler";

const config = getConfigOrThrow();

/*
To-Do:
  1. Pass PostgreSQL connection pool
  2. Pass Insight Application for troubleshooting
*/
const index: AzureFunction = UpdateServicesWebview(
  config.SERVICEID_EXCLUSION_LIST
);

export default index;
