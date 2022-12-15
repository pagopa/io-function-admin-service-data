import {
  EmailString,
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";

import * as t from "io-ts";
import { ServiceSearchItem } from "../generated/definitions/ServiceSearchItem";

export type ServiceFieldR = t.TypeOf<typeof ServiceFieldR>;
export const ServiceFieldR = t.interface({
  // data related to the subscription received from COSMOS
  authorizedCIDRS: t.interface({ ip: t.readonlyArray(t.string) }),
  id: NonEmptyString,
  isVisible: t.boolean,
  name: NonEmptyString,
  organizationFiscalCode: OrganizationFiscalCode,
  requireSecureChannels: t.boolean,
  version: t.number,

  // other data
  // eslint-disable-next-line sort-keys
  departmentName: NonEmptyString,
  maxAllowedPaymentAmount: t.number,
  organizationName: NonEmptyString,
  quality: t.number,
  serviceId: NonEmptyString,

  // data related to the APIM account that owns the related subscription
  // eslint-disable-next-line sort-keys
  subscriptionAccountEmail: EmailString,
  subscriptionAccountId: NonEmptyString,
  subscriptionAccountName: NonEmptyString,
  subscriptionAccountSurname: NonEmptyString
});

export type ServiceFieldO = t.TypeOf<typeof ServiceFieldO>;
export const ServiceFieldO = t.partial({
  description: NonEmptyString,
  scope: NonEmptyString,
  serviceMetadata: t.unknown
});

export type ServiceRowDataTable = t.TypeOf<typeof ServiceRowDataTable>;
export const ServiceRowDataTable = t.union([ServiceFieldR, ServiceFieldO]);

export const ServiceSearchResultSet = t.interface({
  rowCount: t.number,
  rows: t.readonlyArray(ServiceSearchItem)
});
export type ServiceSearchResultSet = t.TypeOf<typeof ServiceSearchResultSet>;
