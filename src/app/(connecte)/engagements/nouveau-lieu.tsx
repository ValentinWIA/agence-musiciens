"use client";

import { startTransition, useActionState, useState, useTransition, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { PAYS } from "@/lib/dates";
import type { Proposition } from "@/lib/geocodage";
import { chercherLieu, creerLieu, type EtatLieu } from "./lieux/actions";

export type LieuCree = { id: string; nom: string; ville: string };

type Props = { fenetre: RefObject<HTMLDialogElement | null>; onCree: (lieu: LieuCree) => void };

// Fenêtre placée à côté du formulaire d'engagement (un formulaire ne peut pas en contenir un autre) :
// la saisie de l'engagement n'est donc jamais touchée.
export function NouveauLieu({ fenetre, onCree }: Props) {
  // Changer la clé remet la fenêtre à zéro pour le lieu suivant.
  const [cle, setCle] = useState(0);
  const fermer = () => {
    fenetre.current?.close();
    setCle((c) => c + 1);
  };
  return (
    <dialog
      ref={fenetre}
      aria-labelledby="titre-nouveau-lieu"
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-lg border bg-background p-5 text-foreground backdrop:bg-black/50"
    >
      <h2 id="titre-nouveau-lieu" className="mb-4 font-logo text-2xl">
        Nouveau lieu
      </h2>
      <FormulaireLieu
        key={cle}
        onCree={(lieu) => {
          onCree(lieu);
          fermer();
        }}
        onAnnule={fermer}
      />
    </dialog>
  );
}

function FormulaireLieu({ onCree, onAnnule }: { onCree: (lieu: LieuCree) => void; onAnnule: () => void }) {
  const [etat, action, enCours] = useActionState<EtatLieu, FormData>(async (precedent, formData) => {
    const resultat = await creerLieu(precedent, formData);
    if (resultat.lieu) onCree(resultat.lieu);
    return resultat;
  }, {});
  const [pays, setPays] = useState<string>("France");
  const [adresse, setAdresse] = useState("");
  const [ville, setVille] = useState("");
  const [propositions, setPropositions] = useState<Proposition[]>([]);
  const [choix, setChoix] = useState<Proposition | null>(null);
  const [erreurRecherche, setErreurRecherche] = useState<string>();
  const [rechercheEnCours, lancerRecherche] = useTransition();
  const err = etat.erreurs ?? {};
  const enFrance = pays === "France";

  // Une adresse modifiée rend les propositions caduques : on oblige à chercher de nouveau.
  const oublierRecherche = () => {
    setPropositions([]);
    setChoix(null);
    setErreurRecherche(undefined);
  };

  const chercher = () =>
    lancerRecherche(async () => {
      oublierRecherche();
      const r = await chercherLieu(adresse, ville);
      setPropositions(r.propositions ?? []);
      setErreurRecherche(r.erreur);
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const donnees = new FormData(e.currentTarget);
        startTransition(() => action(donnees));
      }}
      className="grid gap-4"
    >
      <Champ id="lieu-nom" titre="Nom de la salle" erreurs={err.nom}>
        <Input id="lieu-nom" name="nom" maxLength={120} />
      </Champ>

      <Champ id="lieu-pays" titre="Pays" erreurs={err.pays}>
        <NativeSelect
          id="lieu-pays"
          name="pays"
          value={pays}
          onChange={(e) => {
            setPays(e.target.value);
            oublierRecherche();
          }}
        >
          {PAYS.map((p) => (
            <NativeSelectOption key={p} value={p}>
              {p}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Champ>

      <Champ id="lieu-adresse" titre="Adresse (numéro et rue)" erreurs={err.adresse}>
        <Input
          id="lieu-adresse"
          name="adresse"
          maxLength={200}
          value={adresse}
          onChange={(e) => {
            setAdresse(e.target.value);
            oublierRecherche();
          }}
        />
      </Champ>

      <Champ id="lieu-ville" titre="Ville (sans code postal)" erreurs={err.ville}>
        <Input
          id="lieu-ville"
          name="ville"
          maxLength={100}
          value={ville}
          onChange={(e) => {
            setVille(e.target.value);
            oublierRecherche();
          }}
        />
      </Champ>

      {enFrance ? (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Position sur la carte</legend>
          <Button type="button" variant="outline" className="justify-self-start" onClick={chercher} disabled={rechercheEnCours}>
            {rechercheEnCours ? "Recherche…" : "Chercher l'adresse"}
          </Button>
          {erreurRecherche && (
            <p role="alert" className="text-sm text-destructive">
              {erreurRecherche}
            </p>
          )}
          {propositions.length > 0 && (
            <div className="grid gap-1.5 text-sm">
              <p className="text-muted-foreground">Choisissez la bonne adresse :</p>
              {propositions.map((p) => (
                <label key={`${p.libelle}-${p.latitude}-${p.longitude}`} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="proposition"
                    checked={choix === p}
                    onChange={() => {
                      // Rue et ville de la proposition remplacent la saisie, sans effacer les propositions.
                      setChoix(p);
                      if (p.rue) setAdresse(p.rue);
                      if (p.ville) setVille(p.ville);
                    }}
                  />
                  {p.libelle}
                </label>
              ))}
            </div>
          )}
          {/* Les coordonnées viennent de la proposition choisie, jamais d'une prise automatique de la première. */}
          <input type="hidden" name="latitude" value={choix?.latitude ?? ""} />
          <input type="hidden" name="longitude" value={choix?.longitude ?? ""} />
          {(err.latitude || err.longitude) && (
            <p className="text-sm text-destructive">Cherchez l&apos;adresse puis choisissez une proposition.</p>
          )}
        </fieldset>
      ) : (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Position sur la carte (copiée d&apos;une carte en ligne)</legend>
          <div className="flex flex-wrap gap-2">
            <Input name="latitude" inputMode="decimal" placeholder="Latitude, ex. 46.2044" aria-label="Latitude" className="w-48" />
            <Input name="longitude" inputMode="decimal" placeholder="Longitude, ex. 6.1432" aria-label="Longitude" className="w-48" />
          </div>
          <Erreurs liste={[...(err.latitude ?? []), ...(err.longitude ?? [])]} />
        </fieldset>
      )}

      {(etat.erreurs || etat.erreur) && (
        <p role="alert" className="text-sm text-destructive">
          {etat.erreur ?? "Le lieu n'a pas été créé : corrigez les champs signalés."}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onAnnule}>
          Annuler
        </Button>
        <Button type="submit" disabled={enCours}>
          {enCours ? "Création…" : "Créer le lieu"}
        </Button>
      </div>
    </form>
  );
}

function Champ({ id, titre, erreurs, children }: { id: string; titre: string; erreurs?: string[]; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{titre}</Label>
      {children}
      <Erreurs liste={erreurs} />
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
