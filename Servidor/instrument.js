const Sentry = require("@sentry/node");

Sentry.init({
  dsn: "https://dc8059428fb11fb8b0bed9605cbadc59@o4511316795588608.ingest.us.sentry.io/4511316812038144",
  sendDefaultPii: true,
  tracesSampleRate: 1.0
});