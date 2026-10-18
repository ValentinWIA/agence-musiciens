"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { indexer, type EtatIndexation } from "./actions";

export function FormulaireIndexation() {
  const [etat, action, enCours] = useActionState<EtatIndexation>(indexer, {});

  return (
    <form action={action} className="grid gap-3">
      <Button type="submit" variant="outline" disabled={enCours} className="w-fit">
        {enCours ? "Lecture des documents et calcul…" : "Indexer les documents"}
      </Button>
      {etat.message && (
        <p role={etat.reussi ? "status" : "alert"} className={etat.reussi ? "text-sm" : "text-sm text-destructive"}>
          {etat.message}
        </p>
      )}
    </form>
  );
}
