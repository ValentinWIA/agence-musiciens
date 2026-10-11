import type { Statut } from "./engagements";

// La règle de conflit d'agenda (voir docs/engagements.md, section 8, et SPEC.md, règle 1).
// Fonctions pures : elles ne lisent pas la base ; l'action serveur leur passe les engagements à comparer.

// Les trois réglages de la règle, réunis ici pour être ajustés en un seul endroit.
export const DETOUR_ROUTE = 1.3; // les routes ne sont pas droites
export const VITESSE_KMH = 80;
export const MARGE_MINUTES = 60; // repos, installation, raccord

const RAYON_TERRE_KM = 6371;

// Seuls les engagements tenus bloquent : deux options sur une même date restent possibles.
const STATUTS_TENUS: readonly Statut[] = ["confirme", "joue", "facture", "paye"];

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

export type Conflit = {
  musicien: string;
  autre: Concert;
  // L'autre concert a lieu avant ou après celui qu'on veut confirmer ; « chevauchement » s'ils se recouvrent.
  position: "avant" | "apres" | "chevauchement";
  trajetMinutes: number;
};

const finDe = (c: Concert) => c.debut.getTime() + c.dureeMinutes * 60_000;

// Tous les conflits qui empêchent de confirmer `aConfirmer` (liste vide : confirmation permise).
// Un duo est refusé dès qu'un de ses musiciens a un conflit ; chaque conflit est rendu pour être cité.
export function trouverConflits(aConfirmer: Concert, autres: Concert[]): Conflit[] {
  const conflits: Conflit[] = [];
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
