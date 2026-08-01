const path = require('path');
const fs = require('fs');

// Pega o caminho de onde o .exe está rodando
const pastaAtual = process.cwd();
const sentryPath = path.join(pastaAtual, 'node_modules', '@sentry', 'node');

if (fs.existsSync(sentryPath)) {
    const Sentry = require(sentryPath);
    Sentry.init({
      dsn: "https://dc8059428fb11fb8b0bed9605cbadc59@o4511316795588608.ingest.us.sentry.io/4511316812038144",
      defaultIntegrations: false,
      integrations: [],
      tracesSampleRate: 1.0,
    });
    console.log("🛡️ Sentry ativo!");
} else {
    console.log("⚠️ Sentry ignorado (node_modules não encontrada).");
}