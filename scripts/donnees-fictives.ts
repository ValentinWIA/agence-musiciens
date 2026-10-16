// Jeu de données FICTIF de l'agence : aucune personne réelle (les lieux, eux, sont de vraies salles).
// Les dates sont fixes pour que le jeu soit identique à chaque exécution (repère : octobre 2026).
// Cas tordus repérés par « CAS » dans les notes.

import type { Devise } from "@/lib/argent";

export const MUSICIENS = {
  anna: {
    nom: "Anna Petit", email: "anna.petit@agence-musiciens.test", instrument: "piano",
    biographie: "Pianiste fictive formée à Lyon, lauréate d'un concours imaginaire. Se produit en récital et en duo avec violon.",
    repertoire: "Chopin — Ballades\nDebussy — Préludes, livre I\nSchumann — Kinderszenen",
    notesAgent: "Souhaite plus de récitals en solo. Relancer Lyon pour la saison 2027-2028.",
  },
  hugo: { nom: "Hugo Lambert", email: "hugo.lambert@agence-musiciens.test", instrument: "piano" }, // CAS fiche vide
  louis: {
    nom: "Louis Roy", email: "louis.roy@agence-musiciens.test", instrument: "violon",
    biographie: "Violoniste fictif installé à Londres, chambriste avant tout.",
    repertoire: "Bach — Partita n° 2\nFranck — Sonate pour violon et piano",
    notesAgent: "Vit à Londres : prévoir les trajets en train. Préfère les duos aux récitals.",
  },
  ines: {
    nom: "Inès Moreau", email: "ines.moreau@agence-musiciens.test", instrument: "violon",
    biographie: "Violoniste fictive, passionnée de musique française.",
    repertoire: "Ravel — Tzigane\nFauré — Sonate n° 1",
  },
} as const;

export const PROGRAMMATEURS = {
  garnier: { nom: "Sophie Garnier", structure: "Saison des salles parisiennes", email: "s.garnier@exemple.test", telephone: "01 00 00 00 01" },
  delorme: { nom: "Marc Delorme", structure: "Réseau des festivals du Sud", email: "m.delorme@exemple.test", telephone: "04 00 00 00 02" },
  fontaine: { nom: "Claire Fontaine", structure: "Saison musicale de Suisse romande et alémanique", email: "c.fontaine@exemple.test", telephone: "+41 00 000 00 03" },
  whitfield: { nom: "James Whitfield", structure: "London Chamber Series", email: "j.whitfield@exemple.test", telephone: "+44 0000 000004" },
  tanaka: { nom: "Yuki Tanaka", structure: "Tokyo Recital Series", email: "y.tanaka@exemple.test", telephone: null },
} as const;

// Coordonnées fixes : France par le géocodage de l'IGN (11/10/2026), étranger relevées sur une carte.
export const LIEUX = {
  cortot: { nom: "Salle Cortot", adresse: "78 rue Cardinet", ville: "Paris", pays: "France", latitude: 48.884204, longitude: 2.309259 },
  gaveau: { nom: "Salle Gaveau", adresse: "45-47 rue La Boétie", ville: "Paris", pays: "France", latitude: 48.873528, longitude: 2.314195 },
  tce: { nom: "Théâtre des Champs-Élysées", adresse: "15 avenue Montaigne", ville: "Paris", pays: "France", latitude: 48.865672, longitude: 2.303279 },
  lyon: { nom: "Auditorium de Lyon", adresse: "149 rue Garibaldi", ville: "Lyon", pays: "France", latitude: 45.761355, longitude: 4.85292 },
  metz: { nom: "Arsenal", adresse: "3 avenue Ney", ville: "Metz", pays: "France", latitude: 49.114513, longitude: 6.170881 },
  bordeaux: { nom: "Grand-Théâtre", adresse: "Place de la Comédie", ville: "Bordeaux", pays: "France", latitude: 44.842395, longitude: -0.574745 },
  menton: { nom: "Parvis de la basilique Saint-Michel", adresse: "Place de la Conception", ville: "Menton", pays: "France", latitude: 43.77697, longitude: 7.506751 },
  roque: { nom: "Parc du château de Florans", adresse: "Route de Florans", ville: "La Roque-d'Anthéron", pays: "France", latitude: 43.716317, longitude: 5.310814 },
  geneve: { nom: "Victoria Hall", adresse: "Rue du Général-Dufour 14", ville: "Genève", pays: "Suisse", latitude: 46.20145, longitude: 6.14169 },
  zurich: { nom: "Tonhalle", adresse: "Claridenstrasse 7", ville: "Zurich", pays: "Suisse", latitude: 47.36528, longitude: 8.53833 },
  wigmore: { nom: "Wigmore Hall", adresse: "36 Wigmore Street", ville: "Londres", pays: "Royaume-Uni", latitude: 51.51722, longitude: -0.14889 },
  tokyo: { nom: "Tokyo Opera City Concert Hall", adresse: "3-20-2 Nishi-Shinjuku", ville: "Tokyo", pays: "Japon", latitude: 35.68306, longitude: 139.68667 },
} as const;

type Statut = "demande" | "option" | "contrat_envoye" | "confirme" | "joue" | "facture" | "paye" | "annule";

export type EngagementFictif = {
  titre?: string;
  debut: string; // date et heure locales avec leur décalage horaire, ou premier jour de la période si approximative
  precision?: "jour" | "mois" | "saison";
  duree?: number; // minutes
  lieu: keyof typeof LIEUX;
  programmateur: keyof typeof PROGRAMMATEURS;
  musiciens: (keyof typeof MUSICIENS)[];
  statut: Statut;
  avantAnnulation?: Statut; // pour un engagement annulé : le statut qu'il avait, pour pouvoir le rétablir
  cachet?: string; // tel qu'un humain le saisirait
  devise?: Devise;
  programme?: string;
  notes?: string;
};

const RECITAL_PIANO = "Beethoven, Sonate op. 110 ; Chopin, Ballade n° 4 ; Ravel, Gaspard de la nuit";
const RECITAL_PIANO_2 = "Schumann, Kreisleriana ; Debussy, Préludes (livre I, extraits) ; Liszt, Sonate en si mineur";
const RECITAL_VIOLON = "Bach, Partita n° 2 ; Ysaÿe, Sonate n° 3 « Ballade » ; Bartók, Sonate pour violon seul";
const DUO = "Fauré, Sonate n° 1 ; Ravel, Sonate n° 2 ; Franck, Sonate en la majeur";
const DUO_2 = "Mozart, Sonate K. 454 ; Beethoven, Sonate « Kreutzer » ; Prokofiev, Sonate n° 2";

export const ENGAGEMENTS: EngagementFictif[] = [
  // ——— Passés (janvier → début octobre 2026) ———
  { titre: "Récital piano", debut: "2026-01-17T20:00:00+01:00", duree: 90, lieu: "cortot", programmateur: "garnier", musiciens: ["anna"], statut: "paye", cachet: "1800", programme: RECITAL_PIANO },
  { titre: "Récital violon", debut: "2026-01-24T19:30:00+01:00", duree: 75, lieu: "metz", programmateur: "delorme", musiciens: ["louis"], statut: "paye", cachet: "1500", programme: RECITAL_VIOLON },
  { titre: "Duo piano-violon", debut: "2026-02-07T20:00:00+01:00", duree: 90, lieu: "lyon", programmateur: "delorme", musiciens: ["hugo", "ines"], statut: "paye", cachet: "3200", programme: DUO },
  { titre: "Récital piano", debut: "2026-02-21T19:30:00+00:00", duree: 90, lieu: "wigmore", programmateur: "whitfield", musiciens: ["hugo"], statut: "paye", cachet: "1600", devise: "GBP", programme: RECITAL_PIANO_2 },
  { titre: "Duo piano-violon", debut: "2026-03-08T17:00:00+01:00", duree: 90, lieu: "geneve", programmateur: "fontaine", musiciens: ["anna", "louis"], statut: "paye", cachet: "4500", devise: "CHF", programme: DUO_2 },
  { titre: "Récital violon", debut: "2026-03-14T20:00:00+01:00", duree: 75, lieu: "gaveau", programmateur: "garnier", musiciens: ["ines"], statut: "paye", cachet: "1700", programme: RECITAL_VIOLON },
  { titre: "Concert du dimanche", debut: "2026-03-29T11:00:00+02:00", duree: 60, lieu: "bordeaux", programmateur: "delorme", musiciens: ["anna"], statut: "annule", avantAnnulation: "contrat_envoye", cachet: "1200", notes: "Annulé avant confirmation : budget de la saison réduit." },
  { titre: "Récital piano", debut: "2026-04-11T20:00:00+02:00", duree: 90, lieu: "tce", programmateur: "garnier", musiciens: ["hugo"], statut: "paye", cachet: "2500", programme: RECITAL_PIANO },
  { titre: "Duo piano-violon", debut: "2026-04-25T19:30:00+02:00", duree: 90, lieu: "zurich", programmateur: "fontaine", musiciens: ["hugo", "louis"], statut: "paye", cachet: "5200", devise: "CHF", programme: DUO },
  { titre: "Récital violon", debut: "2026-05-09T19:30:00+01:00", duree: 75, lieu: "wigmore", programmateur: "whitfield", musiciens: ["louis"], statut: "paye", cachet: "1400", devise: "GBP", programme: RECITAL_VIOLON },
  { titre: "Récital piano", debut: "2026-05-23T20:00:00+02:00", duree: 90, lieu: "lyon", programmateur: "delorme", musiciens: ["anna"], statut: "paye", cachet: "2000", programme: RECITAL_PIANO_2 },
  { titre: "Soirée de piano", debut: "2026-06-13T21:00:00+02:00", duree: 90, lieu: "roque", programmateur: "delorme", musiciens: ["hugo"], statut: "paye", cachet: "3000", programme: RECITAL_PIANO },
  { titre: "Duo piano-violon", debut: "2026-06-20T21:00:00+02:00", duree: 90, lieu: "menton", programmateur: "delorme", musiciens: ["anna", "ines"], statut: "facture", cachet: "3800", programme: DUO_2 },
  { titre: "Récital violon", debut: "2026-07-04T21:00:00+02:00", duree: 75, lieu: "menton", programmateur: "delorme", musiciens: ["louis"], statut: "facture", cachet: "1900", programme: RECITAL_VIOLON },
  { titre: "Soirée de piano", debut: "2026-07-25T21:00:00+02:00", duree: 90, lieu: "roque", programmateur: "delorme", musiciens: ["anna"], statut: "paye", cachet: "3000", programme: RECITAL_PIANO_2 },
  { titre: "Récital piano", debut: "2026-08-08T21:00:00+02:00", duree: 90, lieu: "roque", programmateur: "delorme", musiciens: ["hugo"], statut: "facture", cachet: "3000", programme: RECITAL_PIANO },
  { titre: "Récital violon", debut: "2026-08-22T21:00:00+02:00", duree: 75, lieu: "menton", programmateur: "delorme", musiciens: ["ines"], statut: "annule", avantAnnulation: "confirme", cachet: "1900", programme: RECITAL_VIOLON, notes: "CAS annulé après confirmation : orage, concert de plein air annulé la veille." },
  { titre: "Duo piano-violon", debut: "2026-09-12T20:00:00+02:00", duree: 90, lieu: "cortot", programmateur: "garnier", musiciens: ["hugo", "louis"], statut: "facture", cachet: "3400", programme: DUO },
  { titre: "Récital piano", debut: "2026-09-19T19:00:00+09:00", duree: 90, lieu: "tokyo", programmateur: "tanaka", musiciens: ["anna"], statut: "joue", cachet: "450000", devise: "JPY", programme: RECITAL_PIANO, notes: "CAS cachet en yens." },
  { titre: "Récital violon", debut: "2026-09-26T20:00:00+02:00", duree: 75, lieu: "bordeaux", programmateur: "delorme", musiciens: ["louis"], statut: "joue", cachet: "1600", programme: RECITAL_VIOLON },
  { titre: "Duo piano-violon", debut: "2026-10-03T19:30:00+02:00", duree: 90, lieu: "geneve", programmateur: "fontaine", musiciens: ["anna", "ines"], statut: "joue", cachet: "4800", devise: "CHF", programme: DUO_2 },
  { titre: "Récital piano", debut: "2026-10-08T20:00:00+02:00", duree: 90, lieu: "metz", programmateur: "delorme", musiciens: ["hugo"], statut: "joue", cachet: "1700", programme: RECITAL_PIANO_2 },

  // ——— À venir (fin octobre 2026 → juin 2027) ———
  { titre: "Récital piano", debut: "2026-10-24T20:00:00+02:00", duree: 90, lieu: "gaveau", programmateur: "garnier", musiciens: ["anna"], statut: "confirme", cachet: "2200", programme: RECITAL_PIANO_2 },
  { titre: "Récital violon", debut: "2026-10-31T19:30:00+01:00", duree: 75, lieu: "lyon", programmateur: "delorme", musiciens: ["ines"], statut: "confirme", cachet: "1800", programme: RECITAL_VIOLON },
  { titre: "Duo piano-violon", debut: "2026-11-07T20:00:00+01:00", duree: 90, lieu: "tce", programmateur: "garnier", musiciens: ["hugo", "louis"], statut: "confirme", cachet: "4200", programme: DUO },
  { titre: "Récital piano", debut: "2026-11-14T20:00:00+01:00", duree: 90, lieu: "cortot", programmateur: "garnier", musiciens: ["hugo"], statut: "confirme", cachet: "2000", programme: RECITAL_PIANO },
  { titre: "Récital violon", debut: "2026-11-20T19:30:00+00:00", duree: 90, lieu: "wigmore", programmateur: "whitfield", musiciens: ["louis"], statut: "confirme", cachet: "1500", devise: "GBP", programme: RECITAL_VIOLON },
  { titre: "Duo piano-violon", debut: "2026-11-21T11:00:00+01:00", duree: 90, lieu: "geneve", programmateur: "fontaine", musiciens: ["anna", "louis"], statut: "contrat_envoye", cachet: "4600", devise: "CHF", programme: DUO, notes: "CAS duo : Louis joue à Londres la veille jusqu'à 21 h (22 h à Genève), environ 750 km (12 h 10 de trajet + 1 h de marge > 13 h) ; Anna est libre. Confirmation impossible." },
  { titre: "Récital violon", debut: "2026-12-04T20:00:00+01:00", duree: 120, lieu: "gaveau", programmateur: "garnier", musiciens: ["ines"], statut: "confirme", cachet: "2000", programme: RECITAL_VIOLON },
  { titre: "Concert de fin d'année", debut: "2026-12-05T10:00:00+01:00", duree: 60, lieu: "menton", programmateur: "delorme", musiciens: ["ines"], statut: "contrat_envoye", cachet: "1500", programme: RECITAL_VIOLON, notes: "CAS conflit de distance : Inès finit à Paris la veille à 22 h, environ 690 km (11 h 16 de trajet + 1 h de marge > 12 h). Confirmation impossible." },
  { titre: "Récital piano", debut: "2026-12-12T20:00:00+01:00", duree: 90, lieu: "lyon", programmateur: "delorme", musiciens: ["anna"], statut: "contrat_envoye", cachet: "2100", programme: RECITAL_PIANO, notes: "CAS normal : Anna est libre, confirmation possible." },
  { titre: "Duo piano-violon", debut: "2026-12-19T19:30:00+01:00", duree: 90, lieu: "zurich", programmateur: "fontaine", musiciens: ["hugo", "ines"], statut: "option", cachet: "5000", devise: "CHF", programme: DUO_2 },
  { titre: "Récital piano", debut: "2027-01-16T20:00:00+01:00", duree: 90, lieu: "tce", programmateur: "garnier", musiciens: ["hugo"], statut: "contrat_envoye", cachet: "2600", programme: RECITAL_PIANO_2 },
  { titre: "Récital violon", debut: "2027-01-23T19:30:00+00:00", duree: 75, lieu: "wigmore", programmateur: "whitfield", musiciens: ["ines"], statut: "option", cachet: "1500", devise: "GBP", programme: RECITAL_VIOLON },
  { titre: "Duo piano-violon", debut: "2027-02-06T20:00:00+01:00", duree: 90, lieu: "bordeaux", programmateur: "delorme", musiciens: ["anna", "louis"], statut: "option", programme: DUO, notes: "CAS option sans cachet : montant en négociation." },
  { titre: "Récital piano", debut: "2027-02-13T19:00:00+09:00", duree: 90, lieu: "tokyo", programmateur: "tanaka", musiciens: ["hugo"], statut: "option", cachet: "500000", devise: "JPY", programme: RECITAL_PIANO },
  { titre: "Récital violon", debut: "2027-03-06T20:00:00+01:00", duree: 75, lieu: "metz", programmateur: "delorme", musiciens: ["louis"], statut: "option", cachet: "1500", programme: RECITAL_VIOLON },
  { titre: "Duo piano-violon", debut: "2027-03-13T17:00:00+01:00", duree: 90, lieu: "geneve", programmateur: "fontaine", musiciens: ["hugo", "louis"], statut: "confirme", cachet: "4700", devise: "CHF", programme: DUO_2, notes: "CAS annulation possible : confirmé, encore annulable avant la date." },
  { titre: "Récital piano", debut: "2027-03-20T20:00:00+01:00", duree: 90, lieu: "cortot", programmateur: "garnier", musiciens: ["anna"], statut: "demande", programme: RECITAL_PIANO_2, notes: "CAS demande sans cachet." },
  { titre: "Récital violon", debut: "2027-05-08T20:00:00+02:00", duree: 75, lieu: "gaveau", programmateur: "garnier", musiciens: ["ines"], statut: "demande", cachet: "1800", notes: "CAS jour férié : 8 mai (avertissement sur la fiche)." },
  { titre: "Duo piano-violon", debut: "2027-04-24T19:30:00+02:00", duree: 90, lieu: "lyon", programmateur: "delorme", musiciens: ["anna", "ines"], statut: "demande" },
  { titre: "Récital piano", debut: "2027-05-01T00:00:00+02:00", precision: "mois", lieu: "zurich", programmateur: "fontaine", musiciens: ["hugo"], statut: "demande", devise: "CHF", notes: "CAS date approximative : « mai 2027 »." },
  { titre: "Récital violon", debut: "2027-05-15T19:30:00+01:00", duree: 75, lieu: "wigmore", programmateur: "whitfield", musiciens: ["louis"], statut: "demande", cachet: "1600", devise: "GBP" },
  { titre: "Duo piano-violon", debut: "2027-03-01T00:00:00+01:00", precision: "saison", lieu: "tokyo", programmateur: "tanaka", musiciens: ["hugo", "ines"], statut: "demande", devise: "JPY", notes: "CAS date approximative : « printemps 2027 »." },
  { titre: "Soirée de piano", debut: "2027-06-19T21:00:00+02:00", duree: 90, lieu: "roque", programmateur: "delorme", musiciens: ["anna"], statut: "option", cachet: "3200", programme: RECITAL_PIANO },
  { titre: "Récital violon", debut: "2027-06-26T21:00:00+02:00", duree: 75, lieu: "menton", programmateur: "delorme", musiciens: ["ines"], statut: "demande", cachet: "2000" },
  { titre: "Festival d'été", debut: "2027-07-01T00:00:00+02:00", precision: "mois", lieu: "roque", programmateur: "delorme", musiciens: ["hugo"], statut: "demande", notes: "CAS date approximative : « juillet 2027 »." },
  { titre: "Saison d'automne", debut: "2027-09-01T00:00:00+02:00", precision: "saison", lieu: "tce", programmateur: "garnier", musiciens: ["anna", "louis"], statut: "demande", notes: "CAS date approximative : « automne 2027 »." },
  { titre: "Récital piano", debut: "2027-01-30T20:00:00+01:00", duree: 90, lieu: "bordeaux", programmateur: "delorme", musiciens: ["hugo"], statut: "annule", avantAnnulation: "option", cachet: "1800", notes: "CAS annulé à venir : salle en travaux." },
  { titre: "Récital violon", debut: "2026-11-28T20:00:00+01:00", duree: 75, lieu: "metz", programmateur: "delorme", musiciens: ["louis"], statut: "confirme", cachet: "1600", programme: RECITAL_VIOLON },
];
