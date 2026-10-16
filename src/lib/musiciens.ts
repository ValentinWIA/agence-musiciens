import { DEVISES, type Devise } from "./argent";
import { STATUTS_TENUS } from "./conflit";
import type { Statut } from "./engagements";

// La fiche d'un musicien (docs/fiches-musiciens.md). Fonctions pures : ni base ni stockage, pour être testées seules.

export const BIOGRAPHIE_MAX = 2000; // caractères
export const REPERTOIRE_MAX_LIGNES = 100;
export const LIGNE_REPERTOIRE_MAX = 200; // caractères : une œuvre, pas un texte collé sur une seule ligne

export type ErreursFiche = { biographie?: string[]; repertoire?: string[] };

// Texte vide → null (rien à afficher). Répertoire : une œuvre par ligne, lignes vides retirées.
export function verifierFiche(saisie: {
  biographie: string;
  repertoire: string;
}): { erreurs: ErreursFiche } | { fiche: { biographie: string | null; repertoire: string | null } } {
  const erreurs: ErreursFiche = {};
  const biographie = saisie.biographie.trim();
  const lignes = saisie.repertoire
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== "");

  if (biographie.length > BIOGRAPHIE_MAX)
    erreurs.biographie = [`${BIOGRAPHIE_MAX} caractères au plus (actuellement ${biographie.length}).`];
  if (lignes.length > REPERTOIRE_MAX_LIGNES)
    erreurs.repertoire = [`${REPERTOIRE_MAX_LIGNES} œuvres au plus (actuellement ${lignes.length}).`];
  else if (lignes.some((l) => l.length > LIGNE_REPERTOIRE_MAX))
    erreurs.repertoire = [`Une œuvre par ligne, ${LIGNE_REPERTOIRE_MAX} caractères au plus par ligne.`];

  if (erreurs.biographie || erreurs.repertoire) return { erreurs };
  return { fiche: { biographie: biographie || null, repertoire: lignes.join("\n") || null } };
}

// Photo : comme pour les PDF, seul le début du contenu compte (ni l'extension ni le type annoncé par le navigateur).
export const PHOTO_MAX_OCTETS = 2 * 1024 * 1024;
export const OCTETS_A_LIRE_PHOTO = 12; // la signature WebP est la plus longue

export type TypePhoto = "image/jpeg" | "image/png" | "image/webp";

export function typeDePhoto(debut: Uint8Array): TypePhoto | null {
  const commencePar = (signature: number[], decalage = 0) => signature.every((o, i) => debut[decalage + i] === o);
  if (commencePar([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (commencePar([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // « RIFF », 4 octets de taille, puis « WEBP »
  if (commencePar([0x52, 0x49, 0x46, 0x46]) && commencePar([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}

export function verifierPhoto(photo: {
  nom: string; // "" si aucun fichier choisi
  taille: number; // en octets
  debut: Uint8Array; // les premiers octets du contenu
}): { erreur: string } | { photo: { type: TypePhoto; taille: number } } {
  if (photo.nom.trim() === "" && photo.taille === 0) return { erreur: "Choisissez une photo." };
  if (photo.taille === 0) return { erreur: "Ce fichier est vide." };
  if (photo.taille > PHOTO_MAX_OCTETS) return { erreur: "Cette photo dépasse 2 Mo." };
  const type = typeDePhoto(photo.debut);
  if (!type) return { erreur: "Ce fichier n'est pas une photo JPEG, PNG ou WebP." };
  return { photo: { type, taille: photo.taille } };
}

// Récapitulatif des engagements d'un musicien. Les annulés ne sont comptés que dans « par statut » :
// un concert annulé n'est ni « à venir » ni « joué ».
export const PASSES_AFFICHES = 5;

export function recapEngagements<E extends { debut: Date; statut: Statut }>(liste: E[], maintenant = new Date()) {
  const parStatut: Partial<Record<Statut, number>> = {};
  for (const e of liste) parStatut[e.statut] = (parStatut[e.statut] ?? 0) + 1;

  const actifs = liste.filter((e) => e.statut !== "annule");
  const aVenir = actifs.filter((e) => e.debut >= maintenant).sort((a, b) => +a.debut - +b.debut);
  const passes = actifs.filter((e) => e.debut < maintenant).sort((a, b) => +b.debut - +a.debut);

  return { aVenir, derniersPasses: passes.slice(0, PASSES_AFFICHES), nombrePasses: passes.length, parStatut };
}

// Cachet moyen d'un musicien, une moyenne par devise (pas de conversion). Seuls les engagements tenus comptent ;
// chaque cachet est partagé entre les musiciens de l'engagement. Bénévole (0) compte, « à définir » (null) non.
// Montants en plus petite unité de la devise, moyenne arrondie à l'unité.
export function cachetMoyen(
  liste: { statut: Statut; cachet: number | null; devise: Devise; nombreMusiciens: number }[],
): { devise: Devise; moyenne: number; nombre: number }[] {
  const parDevise = new Map<Devise, { somme: number; nombre: number }>();
  for (const e of liste) {
    if (!STATUTS_TENUS.includes(e.statut) || e.cachet === null || e.nombreMusiciens < 1) continue;
    const cumul = parDevise.get(e.devise) ?? { somme: 0, nombre: 0 };
    cumul.somme += e.cachet / e.nombreMusiciens;
    cumul.nombre += 1;
    parDevise.set(e.devise, cumul);
  }
  return DEVISES.filter((d) => parDevise.has(d)).map((devise) => {
    const { somme, nombre } = parDevise.get(devise)!;
    return { devise, moyenne: Math.round(somme / nombre), nombre };
  });
}

// Affichées à la place d'une photo absente : « Anna Petit » → « AP », « Jean-Luc Roy » → « JR ».
export function initiales(nom: string): string {
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return "?";
  const premiere = (mot: string) => mot.charAt(0).toLocaleUpperCase("fr-FR");
  return mots.length === 1 ? premiere(mots[0]) : premiere(mots[0]) + premiere(mots[mots.length - 1]);
}
