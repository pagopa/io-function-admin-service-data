import {
  EmailString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { IDecodableConfigPostgreSQL } from "../../utils/config";
import { createSqlServices } from "../handler";

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
