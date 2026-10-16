"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { demanderReinitialisation, type EtatDemande } from "./actions";

export function FormulaireDemande() {
  const [etat, action, enCours] = useActionState<EtatDemande, FormData>(demanderReinitialisation, {});

  if (etat.envoye) {
    return (
      <p role="status">
        Si un compte existe avec cette adresse, un lien pour choisir un nouveau mot de passe vient d&apos;être envoyé.
        Il est valable une heure.
      </p>
    );
  }

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">E-mail du compte</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {etat.erreur && (
        <p role="alert" className="text-sm text-destructive">
          {etat.erreur}
        </p>
      )}
      <Button type="submit" disabled={enCours}>
        {enCours ? "Envoi…" : "Recevoir un lien"}
      </Button>
    </form>
  );
}
