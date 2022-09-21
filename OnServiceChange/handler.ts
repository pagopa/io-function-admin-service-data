import { pipe } from "fp-ts/lib/function";
import * as T from "fp-ts/lib/Task";
import { Context } from "@azure/functions";

type Handler = () => Promise<void>;

// TO DO: This is the Handler and it's to be implemented!
const handler = (): Handler =>
  pipe(
    T.of(void 0),
    T.map(_ => void 0)
  );

const OnServiceChangeHandler = () => (
  _context: Context,
  _documents: ReadonlyArray<unknown>
): Handler => pipe(handler());

export default OnServiceChangeHandler;
