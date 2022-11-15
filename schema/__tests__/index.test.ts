import { Client } from "pg";
import * as env from "./env";

const client = new Client({
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME
});

beforeAll(async () => {
  await client.connect();
});

afterAll(async () => {
  await client.end();
});

const aRandomSubscriptionId = () => `a-sub-id-${Date.now()}`;

// Dummy insert for a given subscriptionId
const aMigrationInsertSQL = (subscriptionId: string) => `
    INSERT INTO "${env.DB_SCHEMA}"."${env.DB_TABLE}"(
        "id", "organizationFiscalCode", "version", "name", "isVisible", "requireSecureChannels", "subscriptionAccountId", "subscriptionAccountName", "subscriptionAccountSurname", "subscriptionAccountEmail")
        VALUES ('${subscriptionId}', '0000000000', 1, 'any name', false, false, 1, 'aName', 'aSurname','an@email.com')
`;

// Select one record by subscriptionId
const aMigrationSelectSQL = (subscriptionId: string) => `
   SELECT * FROM "${env.DB_SCHEMA}"."${env.DB_TABLE}" WHERE "id"='${subscriptionId}'
`;

describe("Test on db", () => {
  it("should select the first row", async () => {
    const subscriptionId = aRandomSubscriptionId();

    await client.query(aMigrationInsertSQL(subscriptionId));

    const {
      rows: [{ id: subscriptionRetrieved }]
    } = await client.query(aMigrationSelectSQL(subscriptionId));

    expect(subscriptionRetrieved.trim()).toBe(subscriptionId.trim());
  });
});
