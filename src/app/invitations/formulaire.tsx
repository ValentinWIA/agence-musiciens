"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { creerInvitation, type EtatInvitation } from "./actions";

export function FormulaireInvitation() {
  const [etat, action, enCours] = useActionState<EtatInvitation, FormData>(creerInvitation, {});

  return (
    <div className="grid gap-4">
      <form action={action} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="nom">Nom</Label>
          <Input id="nom" name="nom" required aria-invalid={!!etat.erreurs?.nom} />
          <Erreurs liste={etat.erreurs?.nom} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required aria-invalid={!!etat.erreurs?.email} />
          <Erreurs liste={etat.erreurs?.email} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="instrument">Instrument</Label>
          <NativeSelect id="instrument" name="instrument" required defaultValue="">
            <NativeSelectOption value="" disabled>
              Choisir…
            </NativeSelectOption>
            <NativeSelectOption value="piano">Piano</NativeSelectOption>
            <NativeSelectOption value="violon">Violon</NativeSelectOption>
          </NativeSelect>
          <Erreurs liste={etat.erreurs?.instrument} />
        </div>
        {etat.message && (
          <p role="alert" className="text-sm text-destructive">
            {etat.message}
          </p>
        )}
        <Button type="submit" disabled={enCours}>
          {enCours ? "Création…" : "Créer l'invitation"}
        </Button>
      </form>

      {etat.lien && (
        <div role="status" className="grid gap-2 rounded-md border p-3">
          <p className="text-sm">Invitation créée. Transmettez ce lien au musicien (valable 7 jours) :</p>
          <Input readOnly value={etat.lien} onFocus={(e) => e.currentTarget.select()} />
        </div>
      )}
    </div>
  );
}

function Erreurs({ liste }: { liste?: string[] }) {
  return liste?.map((e) => (
    <p key={e} className="text-sm text-destructive">
      {e}
    </p>
  ));
}
