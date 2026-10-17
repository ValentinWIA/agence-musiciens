"use client";

import { startTransition, useActionState, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { creerProgrammateur, type EtatProgrammateur } from "./programmateurs/actions";

export type ProgrammateurCree = { id: string; nom: string; structure: string | null };

type Props = {
  fenetre: RefObject<HTMLDialogElement | null>;
  // Venu d'une demande : le nom du demandeur, que l'agent peut corriger.
  nomPropose?: string;
  onCree: (programmateur: ProgrammateurCree) => void;
};

// Fenêtre placée à côté du formulaire d'engagement, comme celle du nouveau lieu : la saisie de l'engagement reste intacte.
export function NouveauProgrammateur({ fenetre, nomPropose, onCree }: Props) {
  // Changer la clé remet la fenêtre à zéro pour le programmateur suivant.
  const [cle, setCle] = useState(0);
  const fermer = () => {
    fenetre.current?.close();
    setCle((c) => c + 1);
  };
  return (
    <dialog
      ref={fenetre}
      aria-labelledby="titre-nouveau-programmateur"
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-lg border bg-background p-5 text-foreground backdrop:bg-black/50"
    >
      <h2 id="titre-nouveau-programmateur" className="mb-4 font-medium">
        Nouveau programmateur
      </h2>
      <FormulaireProgrammateur
        key={cle}
        nomPropose={nomPropose}
        onCree={(programmateur) => {
          onCree(programmateur);
          fermer();
        }}
        onAnnule={fermer}
      />
    </dialog>
  );
}

function FormulaireProgrammateur({
  nomPropose,
  onCree,
  onAnnule,
}: {
  nomPropose?: string;
  onCree: (programmateur: ProgrammateurCree) => void;
  onAnnule: () => void;
}) {
  const [etat, action, enCours] = useActionState<EtatProgrammateur, FormData>(async (precedent, formData) => {
    const resultat = await creerProgrammateur(precedent, formData);
    if (resultat.programmateur) onCree(resultat.programmateur);
    return resultat;
  }, {});
  const err = etat.erreurs ?? {};

  return (
    <form
      // Envoi sans la remise à zéro automatique de React : elle viderait les champs après un refus.
      onSubmit={(e) => {
        e.preventDefault();
        const donnees = new FormData(e.currentTarget);
        startTransition(() => action(donnees));
      }}
      className="grid gap-4"
    >
      <Champ id="programmateur-nom" titre="Nom" erreurs={err.nom}>
        <Input id="programmateur-nom" name="nom" maxLength={120} defaultValue={nomPropose} />
      </Champ>
      <Champ id="programmateur-structure" titre="Structure : salle, festival… (facultatif)" erreurs={err.structure}>
        <Input id="programmateur-structure" name="structure" maxLength={120} />
      </Champ>
      <Champ id="programmateur-email" titre="E-mail" erreurs={err.email}>
        <Input id="programmateur-email" name="email" inputMode="email" maxLength={200} />
      </Champ>

      {etat.erreurs && (
        <p role="alert" className="text-sm text-destructive">
          Le programmateur n&apos;a pas été créé : corrigez les champs signalés.
        </p>
      )}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onAnnule}>
          Annuler
        </Button>
        <Button type="submit" disabled={enCours}>
          {enCours ? "Création…" : "Créer le programmateur"}
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
