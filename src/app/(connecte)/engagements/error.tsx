"use client";

import { Button } from "@/components/ui/button";

// État « erreur » de la liste et des fiches : base injoignable, panne passagère…
export default function ErreurEngagements({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-4 p-4">
      <p role="alert">Impossible de charger les engagements.</p>
      <Button onClick={() => retry()} className="w-fit">
        Réessayer
      </Button>
    </main>
  );
}
