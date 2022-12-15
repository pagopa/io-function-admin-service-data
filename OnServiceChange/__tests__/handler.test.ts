import { RetrievedService } from "@pagopa/io-functions-commons/dist/src/models/service";
import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";
import {
  EmailString,
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { ServiceRowDataTable } from "../../models/Domain";
import {
  ApimSubscriptionResponse,
  ApimDelegateUserResponse,
  IApimConfig
} from "../../models/DomainApim";
import {
  IDecodableConfigAPIM,
  IDecodableConfigPostgreSQL
} from "../../utils/config";
import OnServiceChangeHandler, {
  getApimOwnerIdBySubscriptionId,
  getApimUserBySubscriptionResponse,
  getQuality,
  mapDataToTableRow,
  parseOwnerIdFullPath,
  storeDocumentApimToDatabase
} from "../handler";
import { createUpsertSql } from "../handler";
import * as O from "fp-ts/lib/Option";
import { isRight } from "fp-ts/lib/Either";
import { QueryResult } from "pg";
import { Context } from "@azure/functions";

const mockSubscriptionId = "00000000000000000000000000" as NonEmptyString;
const mockOrganizationFiscalCode = "01234567891" as OrganizationFiscalCode;
const mockOwnerId = "/subscriptions/subid/resourceGroups/resourceGroupName/providers/Microsoft.ApiManagement/service/apimServiceName/users/00000000000000000000000000" as NonEmptyString;

const mockRetrieveDocument = ({
  authorizedCIDRs: ["192.168.0.1/32", "192.168.1.1/32"] as unknown,
  isVisible: true,
  requireSecureChannels: true,
  serviceId: mockSubscriptionId,
  organizationFiscalCode: mockOrganizationFiscalCode,
  version: 0 as NonNegativeInteger,
  serviceMetadata: {
    description:
      "A description field that describe the service and what kind of message it can sends to the users",
    scope: "LOCAL",
    privacyUrl: "https://www.pricavy.url",
    tosUrl: "https://www.tos.url",
    email: "anemail@email.com",
    phone: "+390000000000"
  },
  departmentName: "Department Name",
  maxAllowedPaymentAmount: 0,
  serviceName: "Service Name",
  organizationName: "An Organization Name"
} as unknown) as RetrievedService;
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

const mockServiceRowDataTable = {
  id: mockSubscriptionId,
  isVisible: true,
  requireSecureChannels: true,
  organizationFiscalCode: mockOrganizationFiscalCode,
  subscriptionAccountId: mockOwnerId,
  subscriptionAccountName: "NomeDelegato" as NonEmptyString,
  subscriptionAccountSurname: "CognomeDelegato" as NonEmptyString,
  subscriptionAccountEmail: "email@test.com" as EmailString,
  description: "A description field that describe the service and what kind of message it can sends to the users" as NonEmptyString,
  scope: "LOCAL" as NonEmptyString,
  departmentName: "Department Name",
  maxAllowedPaymentAmount: 0,
  name: "Service Name",
  organizationName: "An Organization Name"
};

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

const mockDocuments = [
  {
    subscriptionId: "00000000000000000000000000" as NonEmptyString,
    organizationFiscalCode: "11111111111" as OrganizationFiscalCode,
    serviceName: "Service Test 1 " as NonEmptyString
  },
  {
    subscriptionId: "00000000000000000000000001" as NonEmptyString,
    organizationFiscalCode: "00000000000" as OrganizationFiscalCode,
    serviceName: "Service Test 2.1" as NonEmptyString
  },
  {
    subscriptionI: "00000000000000000000000002" as NonEmptyString,
    organizationFiscalCode: "00000000000" as OrganizationFiscalCode,
    serviceName: "Service Test 2.2" as NonEmptyString
  }
];
const mockConfig = {};
const mockQueryResult = {
  command: "INSERT",
  rowCount: 1
} as QueryResult;
const mockPool = {
  connect: jest.fn().mockImplementation(() =>
    Promise.resolve({
      query: jest
        .fn()
        .mockImplementation(() => Promise.resolve(mockQueryResult))
    })
  )
};

const mockTelemtryClient = {
  trackGenericError: jest.fn()
};

const mockContext = {
  log: jest.fn(),
  executionContext: { functionName: jest.fn() }
};

describe("Handler", () => {
  it("should return a Function", async () => {
    const apim = (mockApim as unknown) as IApimConfig;
    const mockClientPool = await mockPool.connect();
    const handler = await OnServiceChangeHandler(mockTelemtryClient as any)(
      mockConfig as any,
      apim,
      mockClientPool
    )((mockContext as unknown) as Context, (void 0 as unknown) as any);
    expect(handler).toBeInstanceOf(Array);
  });
});

describe("createUpsertSql", () => {
  it("should compose correct upsert sql", async () => {
    const config = {
      DB_SCHEMA: "ServiceData",
      DB_TABLE: "Export"
    } as IDecodableConfigPostgreSQL;
    const retrievedService = ({
      id: "1234567890",
      authorizedCIDRS: ["192.168.1.1/32", "10.0.0.1/24", "0.0.0.0/0"].reduce(
        (curr: { ip: Array<string> }, v: string) => ({ ip: [...curr.ip, v] }),
        { ip: [] }
      ),
      isVisible: true,
      name: "Service Test",
      organizationFiscalCode: "12345678901",
      organizationName: "A company name",
      scope: "LOCAL",
      quality: 1,
      maxAllowedPaymentAmount: 0,
      description: "A description service that blah blah blah....",
      subscriptionAccountId: "00000000000000000000000000",
      subscriptionAccountName: "source name",
      subscriptionAccountSurname: "source surname",
      subscriptionAccountEmail: "source email",
      version: 0
    } as unknown) as ServiceRowDataTable;
    const expected = `insert into "ServiceData"."Export" ("authorizedCIDRS", "description", "id", "isVisible", "maxAllowedPaymentAmount", "name", "organizationFiscalCode", "organizationName", "quality", "scope", "subscriptionAccountEmail", "subscriptionAccountId", "subscriptionAccountName", "subscriptionAccountSurname", "version") values ('{\"ip\":[\"192.168.1.1/32\",\"10.0.0.1/24\",\"0.0.0.0/0\"]}', 'A description service that blah blah blah....', '1234567890', true, 0, 'Service Test', '12345678901', 'A company name', 1, 'LOCAL', 'source email', '00000000000000000000000000', 'source name', 'source surname', 0) on conflict ("id") do update set "authorizedCIDRS" = excluded."authorizedCIDRS", "departmentName" = excluded."departmentName", "description" = excluded."description", "isVisible" = excluded."isVisible", "maxAllowedPaymentAmount" = excluded."maxAllowedPaymentAmount", "name" = excluded."name", "organizationFiscalCode" = excluded."organizationFiscalCode", "organizationName" = excluded."organizationName", "quality" = excluded."quality", "scope" = excluded."scope", "serviceMetadata" = excluded."serviceMetadata", "subscriptionAccountEmail" = excluded."subscriptionAccountEmail", "subscriptionAccountId" = excluded."subscriptionAccountId", "subscriptionAccountName" = excluded."subscriptionAccountName", "subscriptionAccountSurname" = excluded."subscriptionAccountSurname", "version" = excluded."version" where "Export"."version" < excluded."version"`;

    const sql = createUpsertSql(config)(retrievedService);
    expect(sql.trim()).toBe(expected.trim());
  });
});

describe("mapDataToTableRow", () => {
  it("should create a valid data structure", () => {
    const res = mapDataToTableRow(mockRetrieveDocument, 0, {
      apimUser: mockApimDelegateUserReponse,
      apimSubscription: mockApimSubscriptionResponse
    });
    expect(res).toMatchObject(mockServiceRowDataTable);
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
      mockApimSubscriptionResponse,
      mockTelemtryClient as any
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

describe("storeDocumentApimToDatabase", () => {
  it("should insert a valid document from Delegate", async () => {
    const apim = (mockApim as unknown) as IApimConfig;
    const mockClientPool = await mockPool.connect();
    const res = await storeDocumentApimToDatabase(
      apim,
      mockConfig as any,
      mockClientPool,
      mockTelemtryClient as any
    )(mockDocuments[0] as any)();
    expect(isRight(res)).toBe(true);
    if (isRight(res)) {
      expect(res.right).toHaveProperty("command", "INSERT");
      expect(res.right).toHaveProperty("rowCount", 1);
    }
  });
});
