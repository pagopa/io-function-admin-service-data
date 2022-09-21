import { Context } from "@azure/functions";
import { MigrationRowDataTable } from "../../models/Domain";
import { IDecodableConfigPostgreSQL } from "../../utils/config";
import OnServiceChangeHandler from "../handler";
import { createUpsertSql } from "../handler";

describe("Handler", () => {
  it("should return a Function", async () => {
    const handler = await OnServiceChangeHandler()(
      (void 0 as unknown) as Context,
      (void 0 as unknown) as any
    );
    expect(handler).toBeInstanceOf(Function);
  });
});

describe("createUpsertSql", () => {
  it("should compose correct upsert sql", async () => {
    const config = {
      DB_SCHEMA: "ServiceData",
      DB_TABLE: "Export"
    } as IDecodableConfigPostgreSQL;
    const data = ({
      subscriptionId: "subId1",
      isVisible: true,
      organizationFiscalCode: "12345678901",
      sourceId: "00000000000000000000000000",
      sourceName: "source name",
      sourceSurname: "source surname",
      sourceEmail: "source email",
      serviceVersion: 0,
      serviceName: "Service Test"
    } as unknown) as MigrationRowDataTable;
    const expected = `insert into "ServiceData"."Export" ("isVisible", "organizationFiscalCode", "serviceName", "serviceVersion", "sourceEmail", "sourceId", "sourceName", "sourceSurname", "subscriptionId") values (true, '12345678901', 'Service Test', 0, 'source email', '00000000000000000000000000', 'source name', 'source surname', 'subId1') on conflict ("subscriptionId") do update set "organizationFiscalCode" = excluded."organizationFiscalCode", "serviceVersion" = excluded."serviceVersion", "serviceName" = excluded."serviceName" where "Export"."serviceVersion" < excluded."serviceVersion"`;

    const sql = createUpsertSql(config)(data);
    expect(sql.trim()).toBe(expected.trim());
  });
});
