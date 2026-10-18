"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { testerIa, type EtatTest } from "./actions";

export function FormulaireTest() {
  const [etat, action, enCours] = useActionState<EtatTest>(testerIa, {});

  return (
    <form action={action} className="grid gap-3">
      <Button type="submit" variant="outline" disabled={enCours} className="w-fit">
        {enCours ? "Appel en cours…" : "Tester l'IA"}
      </Button>
      {etat.message && (
        <p role={etat.reussi ? "status" : "alert"} className={etat.reussi ? "text-sm" : "text-sm text-destructive"}>
          {etat.message}
        </p>
      )}
    </form>
  );
}
