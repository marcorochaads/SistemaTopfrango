import { s as setIsSetup, b as buildContextWithSentryScopes, S as SENTRY_SCOPES_CONTEXT_KEY } from './resource-CQdLBDrM.js';
export { a as SEMANTIC_ATTRIBUTE_SENTRY_GRAPHQL_OPERATION, c as SentryPropagator, d as SentrySampler, e as SentrySpanProcessor, f as continueTrace, g as enhanceDscWithOpenTelemetryRootSpanName, h as getActiveSpan, i as getRequestSpanData, j as getScopesFromContext, k as getSentryResource, l as getSpanKind, m as getTraceContextForScope, n as isSentryRequestSpan, o as openTelemetrySetupCheck, p as setOpenTelemetryContextAsyncContextStrategy, q as setupEventContextTrace, r as spanHasAttributes, t as spanHasEvents, u as spanHasKind, v as spanHasName, w as spanHasParentId, x as spanHasStatus, y as startInactiveSpan, z as startSpan, A as startSpanManual, B as suppressTracing, C as withActiveSpan, D as wrapClientClass, E as wrapContextManagerClass, F as wrapSamplingDecision } from './resource-CQdLBDrM.js';
export { getClient, getDynamicSamplingContextFromSpan, shouldPropagateTraceForUrl, withStreamedSpan } from '@sentry/core';
import { ROOT_CONTEXT } from '@opentelemetry/api';
import { AsyncLocalStorage } from 'node:async_hooks';
import { EventEmitter } from 'node:events';
import '@opentelemetry/semantic-conventions';
import '@opentelemetry/core';
import './debug-build-DcLzdrV_.js';
import '@opentelemetry/sdk-trace-base';

const ADD_LISTENER_METHODS = ['addListener', 'on', 'once', 'prependListener', 'prependOnceListener'] ;

/**
 * OpenTelemetry-compatible context manager using Node.js `AsyncLocalStorage`.
 * Semantics match `@opentelemetry/context-async-hooks` (function `bind` + `EventEmitter` patching).
 */
class SentryAsyncLocalStorageContextManager  {
    __init() {this._asyncLocalStorage = new AsyncLocalStorage();}

    __init2() {this._kOtListeners = Symbol('OtListeners');}
   __init3() {this._wrapped = false;}

   constructor() {SentryAsyncLocalStorageContextManager.prototype.__init.call(this);SentryAsyncLocalStorageContextManager.prototype.__init2.call(this);SentryAsyncLocalStorageContextManager.prototype.__init3.call(this);
    setIsSetup('SentryContextManager');
  }

   active() {
    return this._asyncLocalStorage.getStore() ?? ROOT_CONTEXT;
  }

   with(
    context,
    fn,
    thisArg,
    ...args
  ) {
    const ctx2 = buildContextWithSentryScopes(context, this.active());
    const cb = thisArg == null ? fn : fn.bind(thisArg);
    return this._asyncLocalStorage.run(ctx2, cb , ...args);
  }

   enable() {
    return this;
  }

   disable() {
    this._asyncLocalStorage.disable();
    return this;
  }

   bind(context, target) {
    if (target instanceof EventEmitter) {
      return this._bindEventEmitter(context, target);
    }
    if (typeof target === 'function') {
      return this._bindFunction(context, target ) ;
    }
    return target;
  }

  /**
   * Gets underlying AsyncLocalStorage and symbol to allow lookup of scope.
   * This is Sentry-specific.
   */
   getAsyncLocalStorageLookup() {
    return {
      asyncLocalStorage: this._asyncLocalStorage,
      contextSymbol: SENTRY_SCOPES_CONTEXT_KEY,
    };
  }

   _bindFunction(context, target) {
    const managerWith = this.with.bind(this);
    const contextWrapper = function ( ...args) {
      return managerWith(context, () => target.apply(this, args));
    };
    Object.defineProperty(contextWrapper, 'length', {
      enumerable: false,
      configurable: true,
      writable: false,
      value: target.length,
    });
    return contextWrapper;
  }

   _bindEventEmitter(context, ee) {
    if (this._getPatchMap(ee) !== undefined) {
      return ee;
    }
    this._createPatchMap(ee);

    for (const methodName of ADD_LISTENER_METHODS) {
      if (ee[methodName] === undefined) continue;
      ee[methodName] = this._patchAddListener(
        ee,
        ee[methodName] ,
        context,
      );
    }
    if (typeof ee.removeListener === 'function') {
      // oxlint-disable-next-line @typescript-eslint/unbound-method -- patched like upstream OTel context manager
      ee.removeListener = this._patchRemoveListener(ee, ee.removeListener );
    }
    if (typeof ee.off === 'function') {
      // oxlint-disable-next-line @typescript-eslint/unbound-method
      ee.off = this._patchRemoveListener(ee, ee.off );
    }
    if (typeof ee.removeAllListeners === 'function') {
      ee.removeAllListeners = this._patchRemoveAllListeners(
        ee,
        // oxlint-disable-next-line @typescript-eslint/unbound-method
        ee.removeAllListeners ,
      );
    }
    return ee;
  }

   _patchRemoveListener(ee, original) {
    // oxlint-disable-next-line @typescript-eslint/no-this-alias
    const contextManager = this;
    return function ( event, listener) {
      const events = contextManager._getPatchMap(ee)?.[event];
      if (events === undefined) {
        return original.call(this, event, listener);
      }
      const patchedListener = events.get(listener);
      return original.call(this, event, patchedListener || listener);
    };
  }

   _patchRemoveAllListeners(ee, original) {
    // oxlint-disable-next-line @typescript-eslint/no-this-alias
    const contextManager = this;
    return function ( event) {
      const map = contextManager._getPatchMap(ee);
      if (map !== undefined) {
        if (arguments.length === 0) {
          contextManager._createPatchMap(ee);
        } else if (event !== undefined && map[event] !== undefined) {
          // oxlint-disable-next-line @typescript-eslint/no-dynamic-delete -- event-keyed listener map
          delete map[event];
        }
      }
      return original.apply(this, arguments);
    };
  }

   _patchAddListener(ee, original, context) {
    // oxlint-disable-next-line @typescript-eslint/no-this-alias
    const contextManager = this;
    return function ( event, listener) {
      if (contextManager._wrapped) {
        return original.call(this, event, listener);
      }
      let map = contextManager._getPatchMap(ee);
      if (map === undefined) {
        map = contextManager._createPatchMap(ee);
      }
      let listeners = map[event];
      if (listeners === undefined) {
        listeners = new WeakMap();
        map[event] = listeners;
      }
      const patchedListener = contextManager.bind(context, listener);
      listeners.set(listener, patchedListener);

      contextManager._wrapped = true;
      try {
        return original.call(this, event, patchedListener);
      } finally {
        contextManager._wrapped = false;
      }
    };
  }

   _createPatchMap(ee) {
    const map = Object.create(null) ;
    (ee )[this._kOtListeners] = map;
    return map;
  }

   _getPatchMap(ee) {
    return (ee )[this._kOtListeners];
  }
}

export { SentryAsyncLocalStorageContextManager };
//# sourceMappingURL=index.js.map
