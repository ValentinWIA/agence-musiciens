"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { changerStatut, type EtatChangement } from "./actions";

type Props = { id: string; transitions: { cle: string; libelle: string }[] };

// Les boutons que le statut permet ; le serveur rejuge chaque clic (conditions, droits).
export function BoutonsStatut({ id, transitions }: Props) {
  const [etat, action, enCours] = useActionState<EtatChangement, FormData>(changerStatut, {});

  return (
    <div className="grid gap-3">
      <form action={action} className="flex flex-wrap gap-2">
        <input type="hidden" name="id" value={id} />
        {transitions.map(({ cle, libelle }) => (
          <Button
            key={cle}
            type="submit"
            name="transition"
            value={cle}
            disabled={enCours}
            variant={cle === "annuler" ? "destructive" : "default"}
            onClick={(e) => {
              // L'annulation retire l'engagement de l'agenda : on demande confirmation.
              if (cle === "annuler" && !confirm("Annuler cet engagement ? Vous pourrez le rétablir tant que la date n'est pas passée."))
                e.preventDefault();
            }}
          >
            {libelle}
          </Button>
        ))}
      </form>
      {enCours && <p className="text-sm text-muted-foreground">Enregistrement…</p>}
      {!enCours && etat.message && (
        <p role="status" className="text-sm">
          {etat.message}
        </p>
      )}
      {!enCours && etat.erreur && (
        <p role="alert" className="text-sm text-destructive">
          {etat.erreur}
        </p>
      )}
    </div>
  );
}
