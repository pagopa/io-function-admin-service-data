import { Context } from "@azure/functions";
import { Pool } from "pg";
import { IConfig } from "../../utils/config";
import { UpdateServicesWebview, ServiceRecord } from "../handler";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/lib/function";

const mockConfig = {} as IConfig;

const NO_BINDING_DATA = "placeholder for no data";
const createMockContext = () =>
  (({
    log: console,
    bindings: {
      visibleServicesCompact: NO_BINDING_DATA,
      visibleServicesExtended: NO_BINDING_DATA
    }
  } as unknown) as Context);

const mockCursorRead = jest.fn();
const mockPool = ({
  connect: async () => ({
    query: () => ({
      read: mockCursorRead
    })
  })
} as unknown) as Pool;

const anInvalidServiceRecord = { foo: "bar" };
const aServiceRecord = pipe(
  {
    id: "foo",
    name: "foo",
    organizationFiscalCode: "00000000000",
    organizationName: "foo",
    quality: 0.5
  },
  ServiceRecord.decode,
  E.getOrElseW(() => fail("Failed to create mock ServiceRecord"))
);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("UpdateServicesWebview", () => {
  it("should throw if the query fails", async () => {
    mockCursorRead.mockImplementationOnce(() => {
      throw new Error();
    });
    const handler = UpdateServicesWebview(mockConfig, mockPool, {} as any);
    const context = createMockContext();
    const result = handler(context);

    expect(result).rejects.toThrow();
  });

  it("should export empty object if no services are queried", async () => {
    mockCursorRead.mockImplementationOnce(
      async () => [] /* empty record set */
    );
    const handler = UpdateServicesWebview(mockConfig, mockPool, {} as any);
    const context = createMockContext();
    const result = await handler(context);

    expect(result).toBe(undefined);
    // just one iteration
    expect(mockCursorRead).toBeCalledTimes(1);
    // no data has been written to out bindings
    expect(context.bindings.visibleServicesCompact).toBe("[]");
    expect(context.bindings.visibleServicesExtended).toBe("[]");
  });

  it("should ignore invalid service record", async () => {
    mockCursorRead.mockImplementationOnce(async () => [anInvalidServiceRecord]);
    const handler = UpdateServicesWebview(mockConfig, mockPool, {} as any);
    const context = createMockContext();
    const result = await handler(context);

    expect(result).toBe(undefined);
    // just one iteration
    expect(mockCursorRead).toBeCalledTimes(1);
    // no data has been written to out bindings
    expect(context.bindings.visibleServicesCompact).toBe("[]");
    expect(context.bindings.visibleServicesExtended).toBe("[]");
  });
  it("should ignore invalid service record and keep valid ones", async () => {
    mockCursorRead.mockImplementationOnce(async () => [
      anInvalidServiceRecord,
      aServiceRecord
    ]);
    const handler = UpdateServicesWebview(mockConfig, mockPool, {} as any);
    const context = createMockContext();
    const result = await handler(context);

    const expectedCompact = {
      fc: aServiceRecord.organizationFiscalCode,
      o: aServiceRecord.organizationName,
      s: [
        {
          i: aServiceRecord.id,
          n: aServiceRecord.name,
          q: aServiceRecord.quality
        }
      ]
    };

    const expectedExtended = {
      fc: aServiceRecord.organizationFiscalCode,
      o: aServiceRecord.organizationName,
      s: [
        {
          i: aServiceRecord.id,
          n: aServiceRecord.name,
          q: aServiceRecord.quality,
          sc: aServiceRecord.scope,
          d: aServiceRecord.description
        }
      ]
    };

    expect(result).toBe(undefined);
    // just one iteration
    expect(mockCursorRead).toBeCalledTimes(1);
    // no data has been written to out bindings
    expect(context.bindings.visibleServicesCompact).toBe(
      JSON.stringify([expectedCompact])
    );
    expect(context.bindings.visibleServicesExtended).toBe(
      JSON.stringify([expectedExtended])
    );
  });
});
