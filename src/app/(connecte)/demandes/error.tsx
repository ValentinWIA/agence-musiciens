"use client";

import { Button } from "@/components/ui/button";
import { PAGE_LARGE } from "@/components/mise-en-page";

// État « erreur » de la boîte des demandes : base injoignable, panne passagère…
export default function ErreurDemandes({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className={`${PAGE_LARGE} grid gap-4 py-4`}>
      <p role="alert">Impossible de charger les demandes reçues.</p>
      <Button onClick={() => retry()} className="w-fit">
        Réessayer
      </Button>
    </main>
  );
}
