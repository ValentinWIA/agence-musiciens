"use client";

import { Button } from "@/components/ui/button";

// État « erreur » de la boîte des demandes : base injoignable, panne passagère…
export default function ErreurDemandes({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto grid w-full max-w-6xl gap-4 p-4">
      <p role="alert">Impossible de charger les demandes reçues.</p>
      <Button onClick={() => retry()} className="w-fit">
        Réessayer
      </Button>
    </main>
  );
}
