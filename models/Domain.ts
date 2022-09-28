import {
  EmailString,
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";

import * as t from "io-ts";
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

export type ServiceSearchItem = t.TypeOf<typeof ServiceSearchItem>;
export const ServiceSearchItem = t.interface({
  id: NonEmptyString,
  name: NonEmptyString,
  visible: t.boolean
});

export type ServicesSearchList = t.TypeOf<typeof ServicesSearchList>;
export const ServicesSearchList = t.interface({
  items: t.readonlyArray(ServiceSearchItem)
});
