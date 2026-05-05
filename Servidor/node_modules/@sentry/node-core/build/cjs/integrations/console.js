Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');

/**
 * Node-specific console integration that captures breadcrumbs and handles
 * the AWS Lambda runtime replacing console methods after our patch.
 *
 * In Lambda, console methods are patched via `Object.defineProperty` so that
 * external replacements (by the Lambda runtime) are absorbed as the delegate
 * while our wrapper stays in place. Outside Lambda, this delegates entirely
 * to the core `consoleIntegration` which uses the simpler `fill`-based patch.
 */
const consoleIntegration = core.defineIntegration((options = {}) => {
  return {
    name: 'Console',
    setup(client) {
      if (process.env.LAMBDA_TASK_ROOT) {
        core.maybeInstrument('console', instrumentConsoleLambda);
      }

      // Delegate breadcrumb handling to the core console integration.
      const core$1 = core.consoleIntegration(options);
      core$1.setup?.(client);
    },
  };
});

function instrumentConsoleLambda() {
  const consoleObj = core.GLOBAL_OBJ?.console;
  if (!consoleObj) {
    return;
  }

  core.CONSOLE_LEVELS.forEach((level) => {
    if (level in consoleObj) {
      patchWithDefineProperty(consoleObj, level);
    }
  });
}

function patchWithDefineProperty(consoleObj, level) {
  const nativeMethod = consoleObj[level] ;
  core.originalConsoleMethods[level] = nativeMethod;

  let delegate = nativeMethod;
  let savedDelegate;
  let isExecuting = false;

  const wrapper = function (...args) {
    if (isExecuting) {
      // Re-entrant call: a third party captured `wrapper` via the getter and calls it from inside their replacement. We must
      // use `nativeMethod` (not `delegate`) to break the cycle, and we intentionally skip `triggerHandlers` to avoid duplicate
      // breadcrumbs. The outer invocation already triggered the handlers for this console call.
      nativeMethod.apply(consoleObj, args);
      return;
    }
    isExecuting = true;
    try {
      core.triggerHandlers('console', { args, level } );
      delegate.apply(consoleObj, args);
    } finally {
      isExecuting = false;
    }
  };
  core.markFunctionWrapped(wrapper , nativeMethod );

  // consoleSandbox reads originalConsoleMethods[level] to temporarily bypass instrumentation. We replace it with a distinct reference (.bind creates a
  // new function identity) so the setter can tell apart "consoleSandbox bypass" from "external code restoring a native method captured before Sentry init."
  const sandboxBypass = nativeMethod.bind(consoleObj);
  core.originalConsoleMethods[level] = sandboxBypass;

  try {
    let current = wrapper;

    Object.defineProperty(consoleObj, level, {
      configurable: true,
      enumerable: true,
      get() {
        return current;
      },
      set(newValue) {
        if (newValue === wrapper) {
          // consoleSandbox restoring the wrapper: recover the saved delegate.
          if (savedDelegate !== undefined) {
            delegate = savedDelegate;
            savedDelegate = undefined;
          }
          current = wrapper;
        } else if (newValue === sandboxBypass) {
          // consoleSandbox entering bypass: save delegate, let getter return sandboxBypass directly so calls skip the wrapper entirely.
          savedDelegate = delegate;
          current = sandboxBypass;
        } else if (typeof newValue === 'function' && !(newValue ).__sentry_original__) {
          delegate = newValue;
          current = wrapper;
        } else {
          current = newValue;
        }
      },
    });
  } catch {
    // Fall back to fill-based patching if defineProperty fails
    core.fill(consoleObj, level, function (originalConsoleMethod) {
      core.originalConsoleMethods[level] = originalConsoleMethod;

      return function ( ...args) {
        core.triggerHandlers('console', { args, level } );
        core.originalConsoleMethods[level]?.apply(this, args);
      };
    });
  }
}

exports.consoleIntegration = consoleIntegration;
//# sourceMappingURL=console.js.map
