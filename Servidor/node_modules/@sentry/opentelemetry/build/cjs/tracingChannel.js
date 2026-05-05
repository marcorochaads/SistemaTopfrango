Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const node_diagnostics_channel = require('node:diagnostics_channel');
const api = require('@opentelemetry/api');
const core = require('@sentry/core');
const debugBuild = require('./debug-build-ntZrglYX.js');

/**
 * Transform function that creates a span from the channel data.
 */

/**
 * Creates a new tracing channel with proper OTel context propagation.
 *
 * When the channel's `tracePromise` / `traceSync` / `traceCallback` is called,
 * the `transformStart` function runs inside `bindStore` so that:
 *   1. A new span is created from the channel data.
 *   2. The span is set on the OTel context stored in AsyncLocalStorage.
 *   3. Downstream code (including Sentry's span processor) sees the correct parent.
 *
 * @param channelNameOrInstance - Either a channel name string or an existing TracingChannel instance.
 * @param transformStart - Function that creates an OpenTelemetry span from the channel data.
 * @returns The tracing channel with OTel context bound.
 */
function tracingChannel(
  channelNameOrInstance,
  transformStart,
) {
  const channel = node_diagnostics_channel.tracingChannel(
    channelNameOrInstance,
  ) ;

  let lookup;
  try {
    const contextManager = (api.context )._getContextManager();
    lookup = contextManager.getAsyncLocalStorageLookup();
  } catch {
    // getAsyncLocalStorageLookup may not exist if using a non-Sentry context manager
  }

  if (!lookup) {
    debugBuild.DEBUG_BUILD &&
      core.logger.warn(
        '[TracingChannel] Could not access OpenTelemetry AsyncLocalStorage, context propagation will not work.',
      );
    return channel;
  }

  const otelStorage = lookup.asyncLocalStorage;

  // Bind the start channel so that each trace invocation runs the transform
  // and stores the resulting context (with span) in AsyncLocalStorage.
  // @ts-expect-error bindStore types don't account for AsyncLocalStorage of a different generic type
  channel.start.bindStore(otelStorage, (data) => {
    const span = transformStart(data);

    // Store the span on data so downstream event handlers (asyncEnd, error, etc.) can access it.
    data._sentrySpan = span;

    // Return the context with the span set — this is what gets stored in AsyncLocalStorage.
    return api.trace.setSpan(api.context.active(), span);
  });

  return channel;
}

exports.tracingChannel = tracingChannel;
//# sourceMappingURL=tracingChannel.js.map
