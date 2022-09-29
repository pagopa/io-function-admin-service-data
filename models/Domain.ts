import {
  EmailString,
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";

import * as t from "io-ts";
import { ServiceSearchItem } from "../generated/definitions/ServiceSearchItem";
export type MigrationRowDataTable = t.TypeOf<typeof MigrationRowDataTable>;
export const MigrationRowDataTable = t.interface({
  isVisible: t.boolean,
  organizationFiscalCode: OrganizationFiscalCode,
  serviceName: t.string,
  serviceVersion: t.number,
  sourceEmail: EmailString,
  sourceId: NonEmptyString,
  sourceName: NonEmptyString,
  sourceSurname: NonEmptyString,
  subscriptionId: NonEmptyString
});

export const ServiceSearchResultSet = t.interface({
  rowCount: t.number,
  rows: t.readonlyArray(ServiceSearchItem)
});
export type ServiceSearchResultSet = t.TypeOf<typeof ServiceSearchResultSet>;
