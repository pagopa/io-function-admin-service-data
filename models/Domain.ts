import {
  EmailString,
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";

import * as t from "io-ts";
export type MigrationRowDataTable = t.TypeOf<typeof MigrationRowDataTable>;
export const MigrationRowDataTable = t.interface({
  // data related to the subscription received from COSMOS
  id: NonEmptyString,
  isVisible: t.boolean,
  name: NonEmptyString,
  organizationFiscalCode: OrganizationFiscalCode,
  serviceVersion: t.number,

  // data related to the APIM account that owns the related subscription
  subscriptionAccountEmail: EmailString,
  subscriptionAccountId: NonEmptyString,
  subscriptionAccountName: NonEmptyString,
  subscriptionAccountSurname: NonEmptyString
});
