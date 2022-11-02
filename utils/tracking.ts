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
