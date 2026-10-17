"use client";

import { startTransition, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RAISON_MAX } from "@/lib/conflit";
import { changerStatut, type EtatChangement } from "./actions";

// echeance : proposée quand « Poser une option » est possible ; l'agent la change s'il veut.
type Props = { id: string; transitions: { cle: string; libelle: string }[]; echeance?: string };

// Les boutons que le statut permet ; le serveur rejuge chaque clic (conditions, droits).
export function BoutonsStatut({ id, transitions, echeance }: Props) {
  const [etat, action, enCours] = useActionState<EtatChangement, FormData>(changerStatut, {});

  return (
    <div className="grid gap-3">
      <form action={action} className="flex flex-wrap gap-2">
        <input type="hidden" name="id" value={id} />
        {echeance && (
          <div className="flex w-full flex-wrap items-center gap-2">
            <Label htmlFor="option-expire-le">Option jusqu&apos;au</Label>
            <input
              id="option-expire-le"
              name="optionExpireLe"
              type="date"
              defaultValue={echeance}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            />
          </div>
        )}
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
      {/* Refus pour conflit d'agenda : l'agent peut passer outre en écrivant une raison (docs/engagements.md, section 11). */}
      {etat.conflit && (
        <form
          // Envoi sans remise à zéro automatique : après un refus, la raison saisie reste dans le champ.
          onSubmit={(e) => {
            e.preventDefault();
            const donnees = new FormData(e.currentTarget);
            startTransition(() => action(donnees));
          }}
          className="grid gap-2 rounded-md border p-3"
        >
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="transition" value="confirmer" />
          <Label htmlFor="raison-conflit">Raison pour confirmer quand même</Label>
          <textarea
            id="raison-conflit"
            name="raisonConflit"
            maxLength={RAISON_MAX}
            placeholder="Ex. : TGV de 7 h 04, arrivée à Genève à 10 h 15"
            aria-invalid={!!etat.erreurRaison}
            className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
          />
          {etat.erreurRaison && <p className="text-sm text-destructive">{etat.erreurRaison}</p>}
          <Button type="submit" variant="outline" disabled={enCours} className="w-fit">
            Confirmer quand même
          </Button>
        </form>
      )}
    </div>
  );
}
