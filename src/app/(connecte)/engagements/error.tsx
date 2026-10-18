"use client";

import { Button } from "@/components/ui/button";
import { PAGE_LARGE } from "@/components/mise-en-page";

// État « erreur » de la liste et des fiches : base injoignable, panne passagère…
export default function ErreurEngagements({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className={`${PAGE_LARGE} grid gap-4 py-4`}>
      <p role="alert">Impossible de charger les engagements.</p>
      <Button onClick={() => retry()} className="w-fit">
        Réessayer
      </Button>
    </main>
  );
}
