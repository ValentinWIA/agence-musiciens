// Relances proposées par l'assistant et validées par l'agente (docs/semaine-4.md, section 6). Logique pure.
import type { Statut } from "./engagements";

export const ETATS_PROPOSITION = ["en_attente", "envoi_en_cours", "envoyee", "non_envoyee", "refusee"] as const;
export type EtatProposition = (typeof ETATS_PROPOSITION)[number];

export const LIBELLES_PROPOSITION: Record<EtatProposition, string> = {
  en_attente: "en attente",
  envoi_en_cours: "envoi en cours",
  envoyee: "envoyée",
  non_envoyee: "validée, non envoyée (adresse fictive)",
  refusee: "refusée",
};

export const SUJET_MAX = 150;
export const TEXTE_MAX = 3000;

// Ce que la relance concerne : une option à confirmer avant l'échéance, ou un cachet à payer. Rien d'autre.
export function motifRelance(statut: Statut): "Option" | "Cachet impayé" | null {
  if (statut === "option") return "Option";
  if (statut === "joue" || statut === "facture") return "Cachet impayé";
  return null;
}

export function verifierCourriel(saisie: { sujet: unknown; texte: unknown }): { sujet: string; texte: string } | { erreur: string } {
  const sujet = typeof saisie.sujet === "string" ? saisie.sujet.replace(/\s+/g, " ").trim() : "";
  const texte = typeof saisie.texte === "string" ? saisie.texte.trim() : "";
  if (!sujet) return { erreur: "Le sujet est vide." };
  if (sujet.length > SUJET_MAX) return { erreur: `Sujet trop long (${SUJET_MAX} caractères au plus).` };
  if (!texte) return { erreur: "Le texte est vide." };
  if (texte.length > TEXTE_MAX) return { erreur: `Texte trop long (${TEXTE_MAX} caractères au plus).` };
  return { sujet, texte };
}

// Après « Envoyer » : partie, non envoyée parce que l'adresse est fictive (.test), ou remise en attente si Resend a échoué.
export function etatApresEnvoi(adresseFictive: boolean, parti: boolean): EtatProposition {
  if (adresseFictive) return "non_envoyee";
  return parti ? "envoyee" : "en_attente";
}
