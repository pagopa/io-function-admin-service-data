import { Context } from "@azure/functions";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

export const UpdateServicesWebview = (
  _serviceIdExclusionList: ReadonlyArray<NonEmptyString>
) => async (_context: Context): Promise<unknown> =>
  pipe(TE.throwError<string, string>("To be Implementend"))();
