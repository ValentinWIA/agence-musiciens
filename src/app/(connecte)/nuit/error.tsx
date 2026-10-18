"use client";

import { Button } from "@/components/ui/button";
import { PAGE_LARGE } from "@/components/mise-en-page";

// État « erreur » de la page des exécutions : base injoignable, panne passagère…
export default function ErreurNuit({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className={`${PAGE_LARGE} grid gap-4 py-4`}>
      <p role="alert">Impossible de charger le journal des imports.</p>
      <Button onClick={() => retry()} className="w-fit">
        Réessayer
      </Button>
    </main>
  );
}
