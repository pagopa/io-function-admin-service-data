import {
  EmailString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { isRight } from "fp-ts/lib/Either";
import { Pool, QueryResult } from "pg";
import { ServiceSearchResultSet } from "../../models/Domain";
import { IConfig, IDecodableConfigPostgreSQL } from "../../utils/config";
import {
  createSqlServices,
  getServices,
  processResponseFromResultSet
} from "../handler";

const mockQueryResult = {
  command: "SELECT",
  rowCount: 1,
  rows: [
    {
      name: "Service Name",
      id: "1234567890ASDEFG",
      isvisible: true
    }
  ]
} as QueryResult;

const mockPool = {
  query: jest.fn().mockImplementation(() => Promise.resolve(mockQueryResult))
};

describe("createSqlServices", () => {
  it("should create a valid sql query", () => {
    const expectedSql = `select "serviceId", "serviceName", "isVisible" from "SchemaTest"."TableTest" where "DelegateEmail" = 'test@test.com' and "OrganizationFiscalCode" = '12345678901'`;
    const sql = createSqlServices({
      DB_SCHEMA: "SchemaTest",
      DB_TABLE: "TableTest"
    } as IDecodableConfigPostgreSQL)(
      "test@test.com" as EmailString,
      "12345678901" as OrganizationFiscalCode
    );
    expect(sql).toBe(expectedSql);
  });
  it("should prevent sql injection", () => {
    const expectedSql = `select \"serviceId\", \"serviceName\", \"isVisible\" from \"SchemaTest\".\"TableTest\" where \"DelegateEmail\" = '''select *''' and \"OrganizationFiscalCode\" = '12345678901'`;
    const sql = createSqlServices({
      DB_SCHEMA: "SchemaTest",
      DB_TABLE: "TableTest"
    } as IDecodableConfigPostgreSQL)(
      "'select *'" as EmailString,
      "12345678901" as OrganizationFiscalCode
    );
    expect(sql).toBe(expectedSql);
  });
});

describe("getServices", () => {
  it("should return a valid data from query", async () => {
    const res = await getServices(
      {
        DB_SCHEMA: "SchemaTest",
        DB_TABLE: "TableTest"
      } as IConfig,
      (mockPool as unknown) as Pool
    )(
      "email@delegato.com" as EmailString,
      "12345678901" as OrganizationFiscalCode
    )();
    if (isRight(res)) {
      const decoded = ServiceSearchResultSet.decode(res.right);
      expect(isRight(decoded)).toBe(true);
      expect(res.right).toMatchObject({
        command: "SELECT",
        rowCount: 1,
        rows: [
          {
            name: "Service Name",
            id: "1234567890ASDEFG",
            isvisible: true
          }
        ]
      });
    } else {
      fail("it fail to get delegates");
    }
  });
});

describe("Process ResultSet for Delegates", () => {
  it("should generate a valid response data", async () => {
    const res = await processResponseFromResultSet(mockQueryResult)();

    if (isRight(res)) {
      expect(res.right.value).toEqual({
        items: [
          {
            id: "1234567890ASDEFG",
            isvisible: true,
            name: "Service Name"
          }
        ]
      });
    } else {
      fail("it fail to decode");
    }
  });
});
