"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { ecarterDemande, remettreATraiter, type EtatEcart } from "./actions";

// « Écarter » ou « Remettre à traiter » selon l'état ; le serveur revérifie le rôle et l'état.
export function BoutonEcart({ id, ecartee }: { id: string; ecartee: boolean }) {
  const [etat, action, enCours] = useActionState<EtatEcart, FormData>(ecartee ? remettreATraiter : ecarterDemande, {});

  return (
    <form action={action} className="inline-flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="outline" disabled={enCours}>
        {ecartee ? "Remettre à traiter" : "Écarter"}
      </Button>
      {!enCours && etat.erreur && (
        <span role="alert" className="text-sm text-destructive">
          {etat.erreur}
        </span>
      )}
    </form>
  );
}
