import fetch from "node-fetch";
import { delay } from "../../utils/misc";

jest.setTimeout(1e6);

const myAppHost = `http://localhost:9090`;

beforeAll(async () => {
  await delay(20000);
});

describe("Basic", () => {
  it("should startup", () => expect(1).toBe(1));

  it("should expose with application info ", async () => {
    const response = await fetch(`${myAppHost}/api/v1/info`);
    const info = await response.json();

    expect(info).toEqual({});
  });
});
