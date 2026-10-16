"use client";

import { startTransition, useActionState, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PHOTO_MAX_OCTETS } from "@/lib/musiciens";
import { Portrait } from "../../portrait";
import { changerPhoto, retirerPhoto, type EtatPhoto } from "./actions";

export function FormulairePhoto({ id, nom, photo }: { id: string; nom: string; photo: string | null }) {
  const [etat, envoyer, envoiEnCours] = useActionState<EtatPhoto, FormData>(changerPhoto, {});
  const [etatRetrait, retirer, retraitEnCours] = useActionState<EtatPhoto, FormData>(retirerPhoto, {});
  // Refus dans le navigateur, avant un envoi inutile ; le serveur revérifie de toute façon.
  const [tropLourde, setTropLourde] = useState(false);
  const [nomChoisi, setNomChoisi] = useState("");
  // Seul le résultat de la dernière opération (envoi ou retrait) est affiché.
  const [derniere, setDerniere] = useState<"envoi" | "retrait">("envoi");
  const resultat = derniere === "envoi" ? etat : etatRetrait;
  const enCours = envoiEnCours || retraitEnCours;
  const erreur = tropLourde ? "Cette photo dépasse 2 Mo." : resultat.erreur;
  const message = resultat.message;

  return (
    <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
      <Portrait nom={nom} photo={photo} className="w-[140px] rounded-lg border" />
      <div className="grid content-start gap-3">
        <form
          // Recréé après chaque envoi réussi (clé), donc vidé.
          key={etat.envois ?? 0}
          onSubmit={(e) => {
            e.preventDefault();
            const donnees = new FormData(e.currentTarget);
            const fichier = donnees.get("photo");
            if (fichier instanceof File && fichier.size > PHOTO_MAX_OCTETS) return setTropLourde(true);
            setTropLourde(false);
            setDerniere("envoi");
            startTransition(() => envoyer(donnees));
          }}
          className="grid gap-2"
        >
          <input type="hidden" name="id" value={id} />
          <span className="text-sm font-medium">Photo (JPEG, PNG ou WebP, 2 Mo au plus)</span>
          {/* Champ natif caché (son bouton ne se renomme pas) mais envoyé avec le formulaire. */}
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="peer sr-only"
              onChange={(e) => {
                setTropLourde(false);
                setNomChoisi(e.currentTarget.files?.[0]?.name ?? "");
              }}
            />
            {nomChoisi ? (
              <>
                <span className="break-all text-sm">{nomChoisi}</span>
                <label htmlFor="photo" className="cursor-pointer text-sm underline peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50">
                  changer
                </label>
              </>
            ) : (
              <label
                htmlFor="photo"
                className={buttonVariants({ variant: "outline", className: "w-fit cursor-pointer peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50" })}
              >
                Choisir une photo
              </label>
            )}
          </div>
          <Button type="submit" disabled={enCours} className="w-fit">
            {envoiEnCours ? "Envoi…" : photo ? "Remplacer la photo" : "Envoyer la photo"}
          </Button>
        </form>
        {photo && (
          <form action={retirer}>
            <input type="hidden" name="id" value={id} />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={enCours}
              onClick={(e) => {
                if (!confirm("Retirer la photo ? Elle sera effacée définitivement.")) return e.preventDefault();
                setTropLourde(false);
                setDerniere("retrait");
              }}
            >
              {retraitEnCours ? "Retrait…" : "Retirer la photo"}
            </Button>
          </form>
        )}
        {!enCours && erreur && (
          <p role="alert" className="text-sm text-destructive">
            {erreur}
          </p>
        )}
        {!enCours && !erreur && message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
