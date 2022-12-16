import { RetrievedService } from "@pagopa/io-functions-commons/dist/src/models/service";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { pipe } from "fp-ts/lib/function";
import { initTelemetryClient } from "./appinsight";

type TelemetryClient = ReturnType<typeof initTelemetryClient>;

/**
 * Tracing utility that seamlessly return the subject of the tracing after a tracing function is applied
 *
 * @param tracer
 * @returns
 */
export const trace = <T>(tracer: (subject: T) => void) => (subject: T): T => {
  tracer(subject);
  return subject;
};

/**
 * Track when a generic error occurred
 *
 * @param telemetryClient
 * @returns
 */
export const trackGenericError = (telemetryClient: TelemetryClient) => (
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
 * Track when fail to retrieve Apim User from Subscription
 *
 * @param telemetryClient
 * @returns
 */
export const trackFailApimUserBySubscriptionResponse = (
  telemetryClient: TelemetryClient
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
export const trackFailDecode = (telemetryClient: TelemetryClient) => (
  reason: string = ""
): void => {
  telemetryClient.trackEvent({
    name: "developerportal.servicedata.fail-decode",
    properties: {
      reason
    },
    tagOverrides: { samplingEnabled: "false" }
  });
};

const serviceEvent = (eventName: string) => (
  service: RetrievedService
): Parameters<TelemetryClient["trackEvent"]>[0] => ({
  name: eventName,
  properties: {
    id: service.id,
    serviceId: service.serviceId,
    version: service.version
  },
  tagOverrides: { samplingEnabled: "false" }
});

/**
 * Trace an incoming document to be processed
 *
 * @param telemetryClient
 * @returns
 */
export const trackIncomingServiceDocument = (
  telemetryClient: TelemetryClient
) => (service: RetrievedService): void =>
  pipe(
    service,
    serviceEvent("developerportal.servicedata.incoming-service-document"),
    telemetryClient.trackEvent
  );

/**
 * Trace when an incoming service document is processed and imported in database
 *
 * @param telemetryClient
 * @returns
 */
export const trackProcessedServiceDocument = (
  telemetryClient: TelemetryClient
) => (service: RetrievedService): void =>
  pipe(
    service,
    serviceEvent("developerportal.servicedata.processed-service-document"),
    telemetryClient.trackEvent
  );

/**
 * Trace failures on processing an incoming service document
 *
 * @param telemetryClient
 * @returns
 */
export const trackFailedServiceDocumentProcessing = (
  telemetryClient: TelemetryClient
) => (service: RetrievedService): void =>
  pipe(
    service,
    serviceEvent(
      "developerportal.servicedata.failed-service-document-processing"
    ),
    telemetryClient.trackEvent
  );
