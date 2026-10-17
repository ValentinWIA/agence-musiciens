"use client";

import { Button } from "@/components/ui/button";

// État « erreur » de la page des exécutions : base injoignable, panne passagère…
export default function ErreurNuit({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-4 p-4">
      <p role="alert">Impossible de charger les exécutions du flux de nuit.</p>
      <Button onClick={() => retry()} className="w-fit">
        Réessayer
      </Button>
    </main>
  );
}
