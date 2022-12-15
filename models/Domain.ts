import {
  EmailString,
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";

import * as t from "io-ts";
import { ServiceSearchItem } from "../generated/definitions/ServiceSearchItem";
export type MigrationRowDataTable = t.TypeOf<typeof MigrationRowDataTable>;
export const MigrationRowDataTable = t.interface({
  // data related to the subscription received from COSMOS
  authorizedCIDRS: t.interface({ ip: t.readonlyArray(t.string) }),
  id: NonEmptyString,
  isVisible: t.boolean,
  name: NonEmptyString,
  organizationFiscalCode: OrganizationFiscalCode,
  requireSecureChannels: t.boolean,
  version: t.number,

  // data related to the APIM account that owns the related subscription
  // eslint-disable-next-line sort-keys
  subscriptionAccountEmail: EmailString,
  subscriptionAccountId: NonEmptyString,
  subscriptionAccountName: NonEmptyString,
  subscriptionAccountSurname: NonEmptyString
});

export const ServiceSearchResultSet = t.interface({
  rowCount: t.number,
  rows: t.readonlyArray(ServiceSearchItem)
});
export type ServiceSearchResultSet = t.TypeOf<typeof ServiceSearchResultSet>;
