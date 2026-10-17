import * as Sentry from "@sentry/nextjs";

// Appelé une fois au démarrage du serveur. Le projet n'a pas de code « edge » : seul Node.js est configuré.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./sentry.server.config");
}

// Toute erreur non rattrapée d'une page, d'une action ou d'une route part à Sentry.
export const onRequestError = Sentry.captureRequestError;
