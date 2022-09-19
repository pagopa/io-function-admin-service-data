import { ApiManagementClient } from "@azure/arm-apimanagement";
import { EmailString, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { isRight } from "fp-ts/lib/Either";
import { MigrationRowDataTable } from "../../models/Domain";
import {
  ApimDelegateUserResponse,
  ApimSubscriptionResponse,
  IApimConfig
} from "../../models/DomainApim";
import {
  IDecodableConfigAPIM,
  IDecodableConfigPostgreSQL
} from "../../utils/config";
import {
  createUpsertSql,
  getApimOwnerIdBySubscriptionId,
  getApimUserBySubscriptionResponse
} from "../handler";

const mockSubscriptionId = "00000000000000000000000000" as NonEmptyString;

const mockOwnerId = "/subscriptions/subid/resourceGroups/resourceGroupName/providers/Microsoft.ApiManagement/service/apimServiceName/users/00000000000000000000000000" as NonEmptyString;

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

const mockApimSubscriptionGet = jest.fn(() =>
  Promise.resolve(mockApimSubscriptionResponse)
);
const mockApimUserGet = jest.fn(() =>
  Promise.resolve(mockApimDelegateUserReponse)
);

const mockApimClient = {
  subscription: {
    get: mockApimSubscriptionGet
  },
  user: {
    get: mockApimUserGet
  }
};

const mockApim = {
  config: {} as IDecodableConfigAPIM,
  client: mockApimClient
};

describe("getApimOwnerIdBySubscriptionId", () => {
  it("should give a valid userId from a valid subscriptionId", async () => {
    const apim = (mockApim as unknown) as IApimConfig;
    const res = await getApimOwnerIdBySubscriptionId(
      apim,
      mockSubscriptionId
    )();
    expect(isRight(res)).toBe(true);
    if (isRight(res)) {
      expect(res.right).toHaveProperty("subscriptionId");
      expect(res.right).toHaveProperty("ownerId");
    }
  });
});

describe("getApimUserBySubscriptionResponse", () => {
  it("should have valid properties for Organization", async () => {
    const apim = (mockApim as unknown) as IApimConfig;
    const res = await getApimUserBySubscriptionResponse(
      apim,
      mockApimSubscriptionResponse
    )();
    expect(isRight(res)).toBe(true);
    if (isRight(res)) {
      expect(res.right).toHaveProperty("id");
      expect(res.right).toHaveProperty("firstName");
      expect(res.right).toHaveProperty("lastName");
      expect(res.right).toHaveProperty("email");
      expect(res.right).toHaveProperty("note");
      expect(res.right).toHaveProperty("kind");
    }
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
