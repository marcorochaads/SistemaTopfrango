Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const instrumentation = require('@opentelemetry/instrumentation');
const core = require('@sentry/core');

const supportedVersions = ['>=0.0.0 <2.0.0'];

/**
 * Sentry LangGraph instrumentation using OpenTelemetry.
 */
class SentryLangGraphInstrumentation extends instrumentation.InstrumentationBase {
   constructor(config = {}) {
    super('@sentry/instrumentation-langgraph', core.SDK_VERSION, config);
  }

  /**
   * Initializes the instrumentation by defining the modules to be patched.
   */
   init() {
    return [
      new instrumentation.InstrumentationNodeModuleDefinition(
        '@langchain/langgraph',
        supportedVersions,
        this._patch.bind(this),
        exports$1 => exports$1,
        [
          new instrumentation.InstrumentationNodeModuleFile(
            /**
             * In CJS, LangGraph packages re-export from dist/index.cjs files.
             * Patching only the root module sometimes misses the real implementation or
             * gets overwritten when that file is loaded. We add a file-level patch so that
             * _patch runs again on the concrete implementation
             */
            '@langchain/langgraph/dist/index.cjs',
            supportedVersions,
            this._patch.bind(this),
            exports$1 => exports$1,
          ),
          new instrumentation.InstrumentationNodeModuleFile(
            /**
             * In CJS, the prebuilt submodule re-exports from dist/prebuilt/index.cjs.
             * We add a file-level patch under the main module so that CJS require()
             * of @langchain/langgraph/prebuilt gets patched.
             */
            '@langchain/langgraph/dist/prebuilt/index.cjs',
            supportedVersions,
            this._patch.bind(this),
            exports$1 => exports$1,
          ),
        ],
      ),
      new instrumentation.InstrumentationNodeModuleDefinition(
        '@langchain/langgraph/prebuilt',
        supportedVersions,
        this._patch.bind(this),
        exports$1 => exports$1,
        [
          new instrumentation.InstrumentationNodeModuleFile(
            /**
             * In CJS, the prebuilt submodule re-exports from dist/prebuilt/index.cjs.
             * We add file-level patches so _patch runs on the concrete implementation.
             */
            '@langchain/langgraph/dist/prebuilt/index.cjs',
            supportedVersions,
            this._patch.bind(this),
            exports$1 => exports$1,
          ),
        ],
      ),
    ];
  }

  /**
   * Core patch logic applying instrumentation to the LangGraph module.
   */
   _patch(exports$1) {
    const client = core.getClient();
    const options = {
      ...this.getConfig(),
      recordInputs: this.getConfig().recordInputs ?? client?.getOptions().sendDefaultPii,
      recordOutputs: this.getConfig().recordOutputs ?? client?.getOptions().sendDefaultPii,
    };

    // Patch StateGraph.compile to instrument both compile() and invoke()
    if (exports$1.StateGraph && typeof exports$1.StateGraph === 'function') {
      core.instrumentLangGraph(exports$1.StateGraph.prototype , options);
    }

    // Patch createReactAgent to instrument agent creation and invocation
    if (exports$1.createReactAgent && typeof exports$1.createReactAgent === 'function') {
      const originalCreateReactAgent = exports$1.createReactAgent;
      Object.defineProperty(exports$1, 'createReactAgent', {
        value: core.instrumentCreateReactAgent(originalCreateReactAgent , options),
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }

    return exports$1;
  }
}

exports.SentryLangGraphInstrumentation = SentryLangGraphInstrumentation;
//# sourceMappingURL=instrumentation.js.map
