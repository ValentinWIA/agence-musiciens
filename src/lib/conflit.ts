import { fuseauDuPays } from "./dates";
import type { Statut } from "./engagements";

// La règle de conflit d'agenda (voir docs/engagements.md, section 8, et SPEC.md, règle 1).
// Fonctions pures : elles ne lisent pas la base ; l'action serveur leur passe les engagements à comparer.

// Les trois réglages de la règle, réunis ici pour être ajustés en un seul endroit.
export const DETOUR_ROUTE = 1.3; // les routes ne sont pas droites
export const VITESSE_KMH = 80;
export const MARGE_MINUTES = 60; // repos, installation, raccord

const RAYON_TERRE_KM = 6371;

// Seuls les engagements tenus bloquent : deux options sur une même date restent possibles.
export const STATUTS_TENUS: Statut[] = ["confirme", "joue", "facture", "paye"];

type Position = { latitude: number; longitude: number };

// Distance à vol d'oiseau (formule de haversine), en kilomètres.
export function distanceKm(a: Position, b: Position) {
  const radians = (deg: number) => (deg * Math.PI) / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAYON_TERRE_KM * Math.asin(Math.sqrt(h));
}

// Trajet estimé, en minutes : 800 km → 780 min (13 h).
export function trajetMinutes(km: number) {
  return ((km * DETOUR_ROUTE) / VITESSE_KMH) * 60;
}

// Ce que la règle a besoin de savoir d'un engagement (date précise et durée : exigées dès l'option).
export type Concert = {
  id: string;
  statut: Statut;
  debut: Date;
  dureeMinutes: number;
  lieu: Position;
  musiciens: string[];
};

export type Conflit<T extends Concert = Concert> = {
  musicien: string;
  autre: T;
  // L'autre concert a lieu avant ou après celui qu'on veut confirmer ; « chevauchement » s'ils se recouvrent.
  position: "avant" | "apres" | "chevauchement";
  trajetMinutes: number;
};

const finDe = (c: Concert) => c.debut.getTime() + c.dureeMinutes * 60_000;

// Tous les conflits qui empêchent de confirmer `aConfirmer` (liste vide : confirmation permise).
// Un duo est refusé dès qu'un de ses musiciens a un conflit ; chaque conflit est rendu pour être cité.
export function trouverConflits<T extends Concert>(aConfirmer: Concert, autres: T[]): Conflit<T>[] {
  const conflits: Conflit<T>[] = [];
  for (const autre of autres) {
    if (autre.id === aConfirmer.id || !STATUTS_TENUS.includes(autre.statut)) continue;
    const communs = aConfirmer.musiciens.filter((m) => autre.musiciens.includes(m));
    if (communs.length === 0) continue;

    const trajet = trajetMinutes(distanceKm(autre.lieu, aConfirmer.lieu));
    const exigeMs = (trajet + MARGE_MINUTES) * 60_000;
    let position: Conflit["position"];
    if (finDe(autre) <= aConfirmer.debut.getTime()) {
      position = "avant";
      if (aConfirmer.debut.getTime() - finDe(autre) >= exigeMs) continue;
    } else if (finDe(aConfirmer) <= autre.debut.getTime()) {
      position = "apres";
      if (autre.debut.getTime() - finDe(aConfirmer) >= exigeMs) continue;
    } else {
      position = "chevauchement";
    }

    for (const musicien of communs) conflits.push({ musicien, autre, position, trajetMinutes: trajet });
  }
  return conflits;
}

// Pour le message de refus : la ville du lieu, et son pays (l'heure est affichée à l'heure locale du lieu).
export type ConcertSitue = Concert & { lieu: { ville: string; pays: string } };

// Trajet arrondi au quart d'heure supérieur : 412 min → « 7 h », 405 min → « 6 h 45 », 20 min → « 30 min ».
export function formaterTrajet(minutes: number) {
  const arrondi = Math.ceil(minutes / 15) * 15;
  const h = Math.floor(arrondi / 60);
  const min = arrondi % 60;
  if (h === 0) return `${min} min`;
  return min ? `${h} h ${min}` : `${h} h`;
}

// « 15/11 à 22 h » ou « 15/11 à 20 h 30 », à l'heure locale du lieu de l'autre concert.
function quand(c: ConcertSitue) {
  const timeZone = fuseauDuPays(c.lieu.pays);
  const jour = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", timeZone }).format(c.debut);
  const [h, min] = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone }).format(c.debut).split(":");
  return `${jour} à ${Number(h)} h${min === "00" ? "" : ` ${min}`}`;
}

// Une phrase par conflit, partagée par le refus et l'avertissement : ils ne peuvent pas se contredire.
function phrasesConflits(aConfirmer: ConcertSitue, conflits: Conflit<ConcertSitue>[], noms: Record<string, string>) {
  return conflits.map(({ musicien, autre, position, trajetMinutes }) => {
    const debut = `${noms[musicien] ?? "un musicien"} joue à ${autre.lieu.ville} le ${quand(autre)}`;
    if (position === "chevauchement") return `${debut}, au même moment`;
    const marge = `${MARGE_MINUTES / 60} h de marge`;
    const delai = trajetMinutes === 0 ? `même lieu, ${marge}` : `trajet estimé ${formaterTrajet(trajetMinutes)} + ${marge}`;
    return position === "avant"
      ? `${debut}, trop peu de temps pour rejoindre ${aConfirmer.lieu.ville} (${delai})`
      : `${debut}, trop peu de temps pour s'y rendre depuis ${aConfirmer.lieu.ville} (${delai})`;
  });
}

// Le refus expliqué à l'agent (maquette 4.2), qui cite tous les conflits trouvés.
export function messageConflits(aConfirmer: ConcertSitue, conflits: Conflit<ConcertSitue>[], noms: Record<string, string>) {
  return `Confirmation impossible : ${phrasesConflits(aConfirmer, conflits, noms).join(" ; ")}.`;
}

// L'avertissement de la fiche, dès l'option : le même constat, annoncé avant de confirmer (docs/engagements.md, section 9).
export function avertissementConflits(aConfirmer: ConcertSitue, conflits: Conflit<ConcertSitue>[], noms: Record<string, string>) {
  return `Attention : ${phrasesConflits(aConfirmer, conflits, noms).join(" ; ")}. La confirmation sera refusée.`;
}
