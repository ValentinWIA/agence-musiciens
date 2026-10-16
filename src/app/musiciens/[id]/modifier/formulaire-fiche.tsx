"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { BIOGRAPHIE_MAX, NOTES_AGENT_MAX, REPERTOIRE_MAX_LIGNES, type EtatFiche } from "@/lib/musiciens";
import { modifierFiche } from "./actions";

type Props = {
  id: string;
  valeurs: { biographie: string; repertoire: string; notesAgent: string };
  agent: boolean;
};

const classeZoneTexte =
  "w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function FormulaireFiche({ id, valeurs, agent }: Props) {
  const [etat, action, enCours] = useActionState<EtatFiche, FormData>(modifierFiche, {});
  const err = etat.erreurs ?? {};

  return (
    <form
      // Sans la remise à zéro automatique de React : après un refus, la saisie reste dans les champs.
      onSubmit={(e) => {
        e.preventDefault();
        const donnees = new FormData(e.currentTarget);
        startTransition(() => action(donnees));
      }}
      className="grid gap-5"
    >
      <input type="hidden" name="id" value={id} />

      <Champ id="biographie" titre={`Biographie (${BIOGRAPHIE_MAX} caractères au plus)`} erreurs={err.biographie}>
        <textarea id="biographie" name="biographie" rows={6} className={classeZoneTexte} defaultValue={valeurs.biographie} />
      </Champ>

      <Champ
        id="repertoire"
        titre={`Répertoire (une œuvre par ligne, ${REPERTOIRE_MAX_LIGNES} au plus)`}
        erreurs={err.repertoire}
      >
        <textarea id="repertoire" name="repertoire" rows={8} className={classeZoneTexte} defaultValue={valeurs.repertoire} />
      </Champ>

      {/* Le champ n'existe que pour l'agent : le serveur refuse ces notes si elles viennent d'un musicien. */}
      {agent && (
        <Champ
          id="notesAgent"
          titre={`Notes de l'agent (${NOTES_AGENT_MAX} caractères au plus, invisibles pour le musicien)`}
          erreurs={err.notesAgent}
        >
          <textarea id="notesAgent" name="notesAgent" rows={4} className={classeZoneTexte} defaultValue={valeurs.notesAgent} />
        </Champ>
      )}

      {(etat.erreurs || etat.erreur) && (
        <p role="alert" className="text-sm text-destructive">
          {etat.erreur ?? "La fiche n'a pas été enregistrée : corrigez les champs signalés."}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <Link href={`/musiciens/${id}`} className="self-center text-sm underline">
          Annuler
        </Link>
        <Button type="submit" disabled={enCours}>
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}

function Champ({ id, titre, erreurs, children }: { id: string; titre: string; erreurs?: string[]; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{titre}</Label>
      {children}
      {erreurs?.map((e) => (
        <p key={e} className="text-sm text-destructive">
          {e}
        </p>
      ))}
    </div>
  );
}
