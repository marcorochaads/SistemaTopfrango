import { consoleSandbox } from '@sentry/core';
export { getClient, getDynamicSamplingContextFromSpan, shouldPropagateTraceForUrl, withStreamedSpan } from '@sentry/core';
export { a as SEMANTIC_ATTRIBUTE_SENTRY_GRAPHQL_OPERATION, c as SentryPropagator, d as SentrySampler, e as SentrySpanProcessor, f as continueTrace, g as enhanceDscWithOpenTelemetryRootSpanName, h as getActiveSpan, i as getRequestSpanData, j as getScopesFromContext, k as getSentryResource, l as getSpanKind, m as getTraceContextForScope, n as isSentryRequestSpan, o as openTelemetrySetupCheck, p as setOpenTelemetryContextAsyncContextStrategy, q as setupEventContextTrace, r as spanHasAttributes, t as spanHasEvents, u as spanHasKind, v as spanHasName, w as spanHasParentId, x as spanHasStatus, y as startInactiveSpan, z as startSpan, A as startSpanManual, B as suppressTracing, C as withActiveSpan, D as wrapClientClass, E as wrapContextManagerClass, F as wrapSamplingDecision } from './resource-CQdLBDrM.js';
import '@opentelemetry/api';
import '@opentelemetry/semantic-conventions';
import '@opentelemetry/core';
import './debug-build-DcLzdrV_.js';
import '@opentelemetry/sdk-trace-base';

// Stubs for node-specific exports
class SentryAsyncLocalStorageContextManager {
   constructor() {
    consoleSandbox(() => {
      // oxlint-disable-next-line no-console
      console.error('SentryAsyncLocalStorageContextManager is not supported in the browser');
    });
  }
}

export { SentryAsyncLocalStorageContextManager };
//# sourceMappingURL=index.browser.js.map
