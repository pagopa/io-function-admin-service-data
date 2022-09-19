import {
  EmailString,
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { Tagged } from "@pagopa/ts-commons/lib/types";
import * as t from "io-ts";
import {
  ApimDelegateUserResponse,
  ApimSubscriptionResponse
} from "./DomainApim";

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

export declare const ApimDelegateUserResponseTag: Tagged<
  ApimDelegateUserResponse,
  string,
  string,
  unknown
>;
export declare type ApimDelegateUserResponseTag = t.TypeOf<
  typeof ApimDelegateUserResponseTag
>;

export declare const ApimSubscriptionResponseTag: Tagged<
  ApimSubscriptionResponse,
  string,
  string,
  unknown
>;
export declare type ApimSubscriptionResponseTag = t.TypeOf<
  typeof ApimSubscriptionResponseTag
>;
