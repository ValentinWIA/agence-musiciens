"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changerMotDePasse, type EtatNouveauMotDePasse } from "./actions";

export function FormulaireNouveauMotDePasse({ jeton }: { jeton: string }) {
  const [etat, action, enCours] = useActionState<EtatNouveauMotDePasse, FormData>(
    changerMotDePasse.bind(null, jeton),
    {},
  );

  if (etat.reussi) {
    return (
      <p role="status">
        Votre mot de passe est changé.{" "}
        <Link href="/" className="underline">
          Se connecter
        </Link>
      </p>
    );
  }

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="motDePasse">Nouveau mot de passe (12 caractères minimum)</Label>
        <Input id="motDePasse" name="motDePasse" type="password" autoComplete="new-password" required />
      </div>
      {etat.erreur && (
        <p role="alert" className="text-sm text-destructive">
          {etat.erreur}
        </p>
      )}
      <Button type="submit" disabled={enCours}>
        {enCours ? "Enregistrement…" : "Changer le mot de passe"}
      </Button>
    </form>
  );
}
