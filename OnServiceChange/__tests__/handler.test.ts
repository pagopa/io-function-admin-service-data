import { Context } from "@azure/functions";
import { RetrievedService } from "@pagopa/io-functions-commons/dist/src/models/service";
import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";
import {
  EmailString,
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { MigrationRowDataTable } from "../../models/Domain";
import {
  ApimSubscriptionResponse,
  ApimDelegateUserResponse
} from "../../models/DomainApim";
import { IDecodableConfigPostgreSQL } from "../../utils/config";
import OnServiceChangeHandler, {
  mapDataToTableRow,
  parseOwnerIdFullPath
} from "../handler";
import { createUpsertSql } from "../handler";
import * as O from "fp-ts/lib/Option";

const mockSubscriptionId = "00000000000000000000000000" as NonEmptyString;
const mockOrganizationFiscalCode = "01234567891" as OrganizationFiscalCode;
const mockOwnerId = "/subscriptions/subid/resourceGroups/resourceGroupName/providers/Microsoft.ApiManagement/service/apimServiceName/users/00000000000000000000000000" as NonEmptyString;

const mockRetrieveDocument = {
  isVisible: true,
  serviceId: mockSubscriptionId,
  organizationFiscalCode: mockOrganizationFiscalCode,
  version: 0 as NonNegativeInteger
} as RetrievedService;
const mockApimSubscriptionResponse = {
  subscriptionId: mockSubscriptionId,
  ownerId: mockOwnerId
} as ApimSubscriptionResponse;
const mockApimDelegateUserReponse = {
  id: mockOwnerId,
  firstName: "NomeDelegato" as NonEmptyString,
  lastName: "CognomeDelegato" as NonEmptyString,
  email: "email@test.com" as EmailString
} as ApimDelegateUserResponse;
const mockMigrationRowDataTable = {
  isVisible: true,
  subscriptionId: mockSubscriptionId,
  organizationFiscalCode: mockOrganizationFiscalCode,
  sourceId: mockOwnerId,
  sourceName: "NomeDelegato" as NonEmptyString,
  sourceSurname: "CognomeDelegato" as NonEmptyString,
  sourceEmail: "email@test.com" as EmailString
};

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

describe("mapDataToTableRow", () => {
  it("should create a valida data structure", () => {
    const res = mapDataToTableRow(mockRetrieveDocument, {
      apimUser: mockApimDelegateUserReponse,
      apimSubscription: mockApimSubscriptionResponse
    });

    expect(res).toMatchObject(mockMigrationRowDataTable);
  });
});

describe("parseOwnerIdFullPath", () => {
  it("should return None for an empyy path", async () => {
    const fullPath = "" as NonEmptyString;
    const parsed = parseOwnerIdFullPath(fullPath);
    expect(O.isNone(parsed)).toBe(true);
  });
  it("should return None for an invalid path", async () => {
    const fullPath = "This\\IsAnInvalid\\Path" as NonEmptyString;
    const parsed = parseOwnerIdFullPath(fullPath);
    expect(O.isNone(parsed)).toBe(true);
  });
  it("should return None for a malformed path", async () => {
    const fullPath = "/subscriptions/subid/resourceGroups/providers/Microsoft.ApiManagement/service/users/5931a75ae4bbd512a88c680b" as NonEmptyString;
    const parsed = parseOwnerIdFullPath(fullPath);
    expect(O.isNone(parsed)).toBe(true);
  });
  it("should return Some for a valid path", async () => {
    const fullPath = "/subscriptions/subid/resourceGroups/resourceGroupName/providers/Microsoft.ApiManagement/service/apimServiceName/users/5931a75ae4bbd512a88c680b" as NonEmptyString;
    const expected = "5931a75ae4bbd512a88c680b";
    const parsed = parseOwnerIdFullPath(fullPath);
    expect(O.isSome(parsed)).toBe(true);
    if (O.isSome(parsed)) {
      expect(parsed.value).toBe(expected);
    } else {
      throw new Error("Expected some value, received other");
    }
  });
});
