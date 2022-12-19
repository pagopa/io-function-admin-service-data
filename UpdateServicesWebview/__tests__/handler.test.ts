import { Context } from "@azure/functions";
import { Pool } from "pg";
import { IConfig } from "../../utils/config";
import { UpdateServicesWebview } from "../handler";

const mockConfig = {} as IConfig;

const createMockContext = () =>
  (({
    log: console,
    bindings: {
      visibleServicesCompact: null,
      visibleServicesExtended: null
    }
  } as unknown) as Context);

const mockQuery = jest.fn();
const mockPool = ({
  connect: async () => ({
    query: mockQuery
  })
} as unknown) as Pool;

describe("UpdateServicesWebview", () => {
  it("should throw if the query fails", async () => {
    mockQuery.mockImplementationOnce(() => {
      throw new Error();
    });
    const handler = UpdateServicesWebview(mockConfig, mockPool, {} as any);
    const context = createMockContext();
    const result = handler(context);

    expect(result).rejects.toThrow();
  });
});
