"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { accepterInvitation, type EtatAcceptation } from "./actions";

export function FormulaireAcceptation({ jeton, email }: { jeton: string; email: string }) {
  const [etat, action, enCours] = useActionState<EtatAcceptation, FormData>(
    accepterInvitation.bind(null, jeton),
    {},
  );

  if (etat.reussi) {
    return (
      <p role="status">
        Votre compte est créé.{" "}
        <Link href="/" className="underline">
          Se connecter
        </Link>
      </p>
    );
  }

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" value={email} readOnly disabled />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="motDePasse">Choisissez un mot de passe (12 caractères minimum)</Label>
        <Input id="motDePasse" name="motDePasse" type="password" autoComplete="new-password" required />
      </div>
      {etat.erreur && (
        <p role="alert" className="text-sm text-destructive">
          {etat.erreur}
        </p>
      )}
      <Button type="submit" disabled={enCours}>
        {enCours ? "Création…" : "Créer mon compte"}
      </Button>
    </form>
  );
}
