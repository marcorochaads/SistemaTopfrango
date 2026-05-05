Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const resource = require('./resource-XtlN3b7H.js');
require('@opentelemetry/api');
require('@opentelemetry/semantic-conventions');
require('@opentelemetry/core');
require('./debug-build-ntZrglYX.js');
require('@opentelemetry/sdk-trace-base');

// Stubs for node-specific exports
class SentryAsyncLocalStorageContextManager {
   constructor() {
    core.consoleSandbox(() => {
      // oxlint-disable-next-line no-console
      console.error('SentryAsyncLocalStorageContextManager is not supported in the browser');
    });
  }
}

exports.getClient = core.getClient;
exports.getDynamicSamplingContextFromSpan = core.getDynamicSamplingContextFromSpan;
exports.shouldPropagateTraceForUrl = core.shouldPropagateTraceForUrl;
exports.withStreamedSpan = core.withStreamedSpan;
exports.SEMANTIC_ATTRIBUTE_SENTRY_GRAPHQL_OPERATION = resource.SEMANTIC_ATTRIBUTE_SENTRY_GRAPHQL_OPERATION;
exports.SentryPropagator = resource.SentryPropagator;
exports.SentrySampler = resource.SentrySampler;
exports.SentrySpanProcessor = resource.SentrySpanProcessor;
exports.continueTrace = resource.continueTrace;
exports.enhanceDscWithOpenTelemetryRootSpanName = resource.enhanceDscWithOpenTelemetryRootSpanName;
exports.getActiveSpan = resource.getActiveSpan;
exports.getRequestSpanData = resource.getRequestSpanData;
exports.getScopesFromContext = resource.getScopesFromContext;
exports.getSentryResource = resource.getSentryResource;
exports.getSpanKind = resource.getSpanKind;
exports.getTraceContextForScope = resource.getTraceContextForScope;
exports.isSentryRequestSpan = resource.isSentryRequestSpan;
exports.openTelemetrySetupCheck = resource.openTelemetrySetupCheck;
exports.setOpenTelemetryContextAsyncContextStrategy = resource.setOpenTelemetryContextAsyncContextStrategy;
exports.setupEventContextTrace = resource.setupEventContextTrace;
exports.spanHasAttributes = resource.spanHasAttributes;
exports.spanHasEvents = resource.spanHasEvents;
exports.spanHasKind = resource.spanHasKind;
exports.spanHasName = resource.spanHasName;
exports.spanHasParentId = resource.spanHasParentId;
exports.spanHasStatus = resource.spanHasStatus;
exports.startInactiveSpan = resource.startInactiveSpan;
exports.startSpan = resource.startSpan;
exports.startSpanManual = resource.startSpanManual;
exports.suppressTracing = resource.suppressTracing;
exports.withActiveSpan = resource.withActiveSpan;
exports.wrapClientClass = resource.wrapClientClass;
exports.wrapContextManagerClass = resource.wrapContextManagerClass;
exports.wrapSamplingDecision = resource.wrapSamplingDecision;
exports.SentryAsyncLocalStorageContextManager = SentryAsyncLocalStorageContextManager;
//# sourceMappingURL=index.browser.js.map
