"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Dernier filet : une erreur que rien d'autre n'a rattrapée, jusque dans la mise en page racine.
// Elle remplace toute la page, d'où <html> et <body>.
export default function ErreurGlobale({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
        <h1>Une erreur est survenue.</h1>
        <p>Elle a été signalée. Rechargez la page ou revenez dans quelques minutes.</p>
      </body>
    </html>
  );
}
