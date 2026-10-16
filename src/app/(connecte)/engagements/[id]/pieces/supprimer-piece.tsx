"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { supprimerPiece, type EtatSuppressionPiece } from "./actions";

// Bouton de l'agent ; le serveur revérifie le rôle. Après la suppression, la ligne disparaît de la liste.
export function SupprimerPiece({ id, pieceId, nom }: { id: string; pieceId: string; nom: string }) {
  const [etat, action, enCours] = useActionState<EtatSuppressionPiece, FormData>(supprimerPiece, {});

  return (
    <form action={action} className="inline-flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="pieceId" value={pieceId} />
      <Button
        type="submit"
        variant="destructive"
        size="sm"
        disabled={enCours}
        onClick={(e) => {
          if (!confirm(`Supprimer « ${nom} » ? Le fichier sera effacé définitivement.`)) e.preventDefault();
        }}
      >
        {enCours ? "Suppression…" : "Supprimer"}
      </Button>
      {!enCours && etat.erreur && (
        <span role="alert" className="text-sm text-destructive">
          {etat.erreur}
        </span>
      )}
    </form>
  );
}
