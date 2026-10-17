"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { envoyerLeRecap, importerUneNuit, rattraperLesNuits, type EtatImport, type EtatRattrapage, type EtatRecap } from "./actions";

export function FormulaireImport({ nuitProposee, aujourdhui }: { nuitProposee: string; aujourdhui: string }) {
  const [etat, action, enCours] = useActionState<EtatImport, FormData>(importerUneNuit, {});
  const proposee = etat.nuitProposee ?? nuitProposee;

  return (
    <form action={action} className="grid gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-2">
          <Label htmlFor="nuit">Nuit du</Label>
          {/* La clé fait reprendre au champ la nouvelle nuit proposée après chaque import. */}
          <Input key={proposee} id="nuit" name="nuit" type="date" required min="2026-09-20" max={aujourdhui} defaultValue={proposee} className="w-fit" />
        </div>
        <Button type="submit" disabled={enCours}>
          {enCours ? "Import en cours…" : "Importer la nuit"}
        </Button>
      </div>
      {etat.message && (
        <p role={etat.reussi ? "status" : "alert"} className={etat.reussi ? "text-sm" : "text-sm text-destructive"}>
          {etat.message}
        </p>
      )}
    </form>
  );
}

export function FormulaireRattrapage() {
  const [etat, action, enCours] = useActionState<EtatRattrapage>(rattraperLesNuits, {});

  return (
    <form action={action} className="grid gap-3">
      <Button type="submit" disabled={enCours} className="w-fit">
        {enCours ? "Rattrapage en cours…" : "Rattraper les nuits manquantes"}
      </Button>
      {etat.message && (
        <p role={etat.reussi ? "status" : "alert"} className={etat.reussi ? "text-sm" : "text-sm text-destructive"}>
          {etat.message}
        </p>
      )}
    </form>
  );
}

export function FormulaireRecap() {
  const [etat, action, enCours] = useActionState<EtatRecap>(envoyerLeRecap, {});

  return (
    <form action={action} className="grid gap-3">
      <Button type="submit" variant="outline" disabled={enCours} className="w-fit">
        {enCours ? "Envoi en cours…" : "Envoyer le récap du jour"}
      </Button>
      {etat.message && (
        <p role={etat.reussi ? "status" : "alert"} className={etat.reussi ? "text-sm" : "text-sm text-destructive"}>
          {etat.message}
        </p>
      )}
    </form>
  );
}
