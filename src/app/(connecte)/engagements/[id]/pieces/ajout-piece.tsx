"use client";

import { startTransition, useActionState, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { LIBELLES_TYPE_PIECE, TAILLE_MAX_OCTETS, TYPES_PIECE } from "@/lib/pieces-jointes";
import { ajouterPiece, type EtatAjoutPiece } from "./actions";

export function AjoutPiece({ id }: { id: string }) {
  const [etat, action, enCours] = useActionState<EtatAjoutPiece, FormData>(ajouterPiece, {});
  // Refus constaté dans le navigateur : au-delà de 4,5 Mo, Vercel rejetterait l'envoi avant même notre serveur.
  const [tropLourd, setTropLourd] = useState(false);
  // Nom du fichier choisi, affiché à la place du bouton ; remis à zéro avec le formulaire après un ajout.
  const [nomChoisi, setNomChoisi] = useState("");
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
          <span className="text-sm font-medium">Fichier PDF (4 Mo au plus)</span>
          {/* Champ natif caché (son bouton « Choisir un fichier » ne se renomme pas) mais toujours envoyé avec le
              formulaire ; nos libellés ouvrent le même sélecteur. */}
          {/* relative : sinon le champ caché, large comme l'écran, élargit la page sur téléphone. */}
          <div className="relative flex flex-wrap items-center gap-2">
            <Input
              id="fichier-piece"
              name="fichier"
              type="file"
              accept="application/pdf,.pdf"
              className="peer sr-only"
              aria-invalid={!!erreursFichier}
              onChange={(e) => {
                setTropLourd(false);
                setNomChoisi(e.currentTarget.files?.[0]?.name ?? "");
              }}
            />
            {nomChoisi ? (
              <>
                <span className="break-all text-sm">{nomChoisi}</span>
                <label htmlFor="fichier-piece" className="cursor-pointer text-sm underline peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50">
                  changer
                </label>
              </>
            ) : (
              <label
                htmlFor="fichier-piece"
                className={buttonVariants({ variant: "outline", className: "cursor-pointer peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50" })}
              >
                Choisir un fichier
              </label>
            )}
          </div>
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
