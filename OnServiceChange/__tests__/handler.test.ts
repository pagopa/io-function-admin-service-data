import { Context } from "@azure/functions";
import OnServiceChangeHandler from "../handler";

describe("Handler", () => {
  it("should return a Function", async () => {
    const handler = await OnServiceChangeHandler()(
      (void 0 as unknown) as Context,
      (void 0 as unknown) as any
    );
    expect(handler).toBeInstanceOf(Function);
  });
});
