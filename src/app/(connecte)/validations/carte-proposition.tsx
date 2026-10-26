"use client";

import { useActionState, useEffect, useRef } from "react";
import { relireCompteurs } from "../compteur";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SUJET_MAX, TEXTE_MAX } from "@/lib/propositions";
import { envoyerProposition, refuserProposition, remettreEnAttente, type EtatDecision } from "./actions";

type Proposition = { id: string; sujet: string; texte: string };

export function CartePropositionFormulaire({ proposition }: { proposition: Proposition }) {
  const [envoi, envoyer, envoiEnCours] = useActionState<EtatDecision, FormData>(envoyerProposition, {});
  const [refus, refuser, refusEnCours] = useActionState<EtatDecision, FormData>(refuserProposition, {});
  const occupe = envoiEnCours || refusEnCours;
  // Après chaque décision (réussie ou non), le nombre « À valider » du menu est relu.
  const premier = useRef(true);
  useEffect(() => {
    if (premier.current) premier.current = false;
    else relireCompteurs();
  }, [envoi, refus]);
  const erreur = envoi.erreur ?? refus.erreur;

  return (
    <form action={envoyer} className="grid gap-3">
      <input type="hidden" name="id" value={proposition.id} />
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">Sujet</span>
        <Input name="sujet" defaultValue={proposition.sujet} maxLength={SUJET_MAX} required disabled={occupe} />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">Texte</span>
        <textarea
          name="texte"
          defaultValue={proposition.texte}
          maxLength={TEXTE_MAX}
          rows={8}
          required
          disabled={occupe}
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </label>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <span className="mr-auto text-xs text-muted-foreground">Rédigé par l&apos;IA, à relire.</span>
        <Button type="submit" formAction={refuser} variant="outline" disabled={occupe}>
          {refusEnCours ? "Refus…" : "Refuser"}
        </Button>
        <Button type="submit" disabled={occupe}>
          {envoiEnCours ? "Envoi…" : "Envoyer"}
        </Button>
      </div>
      {erreur && (
        <p role="alert" className="text-sm text-destructive">
          {erreur}
        </p>
      )}
    </form>
  );
}

export function BoutonRemettreEnAttente({ id }: { id: string }) {
  const [etat, remettre, enCours] = useActionState<EtatDecision, FormData>(remettreEnAttente, {});
  const premier = useRef(true);
  useEffect(() => {
    if (premier.current) premier.current = false;
    else relireCompteurs();
  }, [etat]);
  return (
    <form action={remettre} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="outline" size="sm" disabled={enCours}>
        {enCours ? "Remise…" : "Remettre en attente"}
      </Button>
      {etat.erreur && (
        <span role="alert" className="text-sm text-destructive">
          {etat.erreur}
        </span>
      )}
    </form>
  );
}
