"use client";

import { startTransition, useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { LIBELLES_TYPE_PIECE, TAILLE_MAX_OCTETS, TYPES_PIECE } from "@/lib/pieces-jointes";
import { ajouterPiece, type EtatAjoutPiece } from "./actions";

export function AjoutPiece({ id }: { id: string }) {
  const [etat, action, enCours] = useActionState<EtatAjoutPiece, FormData>(ajouterPiece, {});
  // Refus constaté dans le navigateur : au-delà de 4,5 Mo, Vercel rejetterait l'envoi avant même notre serveur.
  const [tropLourd, setTropLourd] = useState(false);
  const erreursFichier = tropLourd ? ["Ce fichier dépasse 4 Mo."] : etat.erreurs?.fichier;

  return (
    <form
      // Recréé après chaque ajout réussi (clé), donc vidé ; après un refus, le type choisi reste en place.
      key={etat.envois ?? 0}
      onSubmit={(e) => {
        e.preventDefault();
        const donnees = new FormData(e.currentTarget);
        const fichier = donnees.get("fichier");
        if (fichier instanceof File && fichier.size > TAILLE_MAX_OCTETS) return setTropLourd(true);
        setTropLourd(false);
        startTransition(() => action(donnees));
      }}
      className="grid gap-3 rounded-md border p-3"
    >
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap items-start gap-3">
        <div className="grid gap-1">
          <Label htmlFor="type-piece">Type</Label>
          <NativeSelect id="type-piece" name="type" defaultValue="" aria-invalid={!!etat.erreurs?.type}>
            <NativeSelectOption value="">Choisir…</NativeSelectOption>
            {TYPES_PIECE.map((t) => (
              <NativeSelectOption key={t} value={t}>
                {LIBELLES_TYPE_PIECE[t]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Erreurs liste={etat.erreurs?.type} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="fichier-piece">Fichier PDF (4 Mo au plus)</Label>
          <Input
            id="fichier-piece"
            name="fichier"
            type="file"
            accept="application/pdf,.pdf"
            aria-invalid={!!erreursFichier}
            onChange={() => setTropLourd(false)}
          />
          <Erreurs liste={erreursFichier} />
        </div>
      </div>
      <Button type="submit" disabled={enCours} className="w-fit">
        Ajouter la pièce
      </Button>
      {enCours && <p className="text-sm text-muted-foreground">Envoi en cours…</p>}
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
    </form>
  );
}

function Erreurs({ liste }: { liste?: string[] }) {
  return liste?.map((e) => (
    <p key={e} className="text-sm text-destructive">
      {e}
    </p>
  ));
}
