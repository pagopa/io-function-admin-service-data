import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { initTelemetryClient } from "./appinsight";

/**
 * Track when a generic error occurred
 *
 * @param telemetryClient
 * @returns
 */
export const trackGenericError = (
  telemetryClient: ReturnType<typeof initTelemetryClient>
) => (
  reason: string = "",
  obj: unknown = {} /** default empty object to prevent nullish values */
): void => {
  telemetryClient.trackEvent({
    name: "developerportal.servicedata.generic-error",
    properties: {
      obj,
      reason
    },
    tagOverrides: { samplingEnabled: "false" }
  });
};

/**
 * Track when a generic event
 *
 * @param telemetryClient
 * @returns
 */
export const trackEvent = (
  telemetryClient: ReturnType<typeof initTelemetryClient>
) => (event: string = ""): void => {
  telemetryClient.trackEvent({
    name: "developerportal.servicedata.generic-event",
    properties: {
      event
    },
    tagOverrides: { samplingEnabled: "false" }
  });
};

/**
 * Track when fail to retrieve Apim User from Subscription
 *
 * @param telemetryClient
 * @returns
 */
export const trackFailApimUserBySubscriptionResponse = (
  telemetryClient: ReturnType<typeof initTelemetryClient>
) => (
  reason: string = "",
  ownerId: NonEmptyString,
  subscriptionId: NonEmptyString
): void => {
  telemetryClient.trackEvent({
    name: "developerportal.servicedata.fail-apim-user",
    properties: {
      ownerId,
      reason,
      subscriptionId
    },
    tagOverrides: { samplingEnabled: "false" }
  });
};

/**
 * Track when fail to decode something
 *
 * @param telemetryClient
 * @returns
 */
export const trackFailDecode = (
  telemetryClient: ReturnType<typeof initTelemetryClient>
) => (reason: string = ""): void => {
  telemetryClient.trackEvent({
    name: "developerportal.servicedata.fail-decode",
    properties: {
      reason
    },
    tagOverrides: { samplingEnabled: "false" }
  });
};
