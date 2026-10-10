"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { creerPremierAdmin, type EtatInstallation } from "./actions";

export function FormulaireInstallation() {
  const [etat, action, enCours] = useActionState<EtatInstallation, FormData>(
    creerPremierAdmin,
    {},
  );

  if (etat.reussi) {
    return (
      <p role="status">
        Compte administrateur créé. Vous pourrez vous connecter dès que la page de connexion sera en place.
      </p>
    );
  }

  return (
    <form action={action} className="grid gap-4">
      <Champ nom="nom" libelle="Nom" erreurs={etat.erreurs?.nom} />
      <Champ nom="email" libelle="E-mail" type="email" erreurs={etat.erreurs?.email} />
      <Champ
        nom="motDePasse"
        libelle="Mot de passe (12 caractères minimum)"
        type="password"
        erreurs={etat.erreurs?.motDePasse}
      />
      {etat.message && (
        <p role="alert" className="text-sm text-destructive">
          {etat.message}
        </p>
      )}
      <Button type="submit" disabled={enCours}>
        {enCours ? "Création…" : "Créer le compte administrateur"}
      </Button>
    </form>
  );
}

function Champ({
  nom,
  libelle,
  type = "text",
  erreurs,
}: {
  nom: string;
  libelle: string;
  type?: string;
  erreurs?: string[];
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={nom}>{libelle}</Label>
      <Input id={nom} name={nom} type={type} required aria-invalid={!!erreurs} />
      {erreurs?.map((e) => (
        <p key={e} className="text-sm text-destructive">
          {e}
        </p>
      ))}
    </div>
  );
}
