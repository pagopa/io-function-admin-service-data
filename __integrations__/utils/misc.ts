export const delay = (ms: number): Promise<ReturnType<typeof setTimeout>> =>
  new Promise(done => setTimeout(done, ms));

export const envFlag = (e: unknown): boolean => e === "1" || e === "true";
