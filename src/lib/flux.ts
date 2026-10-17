import { z } from "zod";

// Lecture d'une nuit du flux (sujet `reservations`), traduite dans notre vocabulaire.
// Logique pure : ni base ni réseau. Les messages restent du texte : rien ici ne les interprète.

export const STATUTS_DEMANDE = ["demandee", "confirmee", "terminee", "annulee"] as const;
export type StatutDemande = (typeof STATUTS_DEMANDE)[number];

export type Effet =
  | {
      type: "creation";
      reference: string;
      statut: StatutDemande;
      programmateur: string;
      lieu: string;
      date: string; // AAAA-MM-JJ, sans heure
      dureeMinutes: number;
      categorie: string;
      recueLe: string;
    }
  | { type: "changement-statut"; reference: string; statut: StatutDemande; commentaire: string | null }
  | { type: "message"; reference: string; de: string; texte: string };

export type EvenementLu =
  | { etat: "a-traiter"; id: string; horodatage: Date; effet: Effet; brut: unknown }
  | { etat: "doublon"; id: string; horodatage: Date; brut: unknown }
  | { etat: "mis-de-cote"; id: string | null; horodatage: Date | null; raison: string; brut: unknown };

export type NuitLue =
  | { ok: true; nuitDu: string; evenements: EvenementLu[] }
  | { ok: false; raison: string };

// Ce qui est déjà en base : un id déjà reçu n'est pas retraité, une référence connue peut être suivie.
export type DejaConnu = { ids: ReadonlySet<string>; references: ReadonlySet<string> };

// Accent cassé : « Ã© » (UTF-8 relu en Latin-1) ou caractère de remplacement.
const texte = z
  .string()
  .trim()
  .min(1)
  .refine((t) => !/Ã[\u0080-¿]|�/.test(t), "accent cassé");

const entete = z.object({
  id: texte,
  horodatage: z.iso.datetime({ offset: true }),
  type: z.string(),
});

// Chaque schéma valide l'événement entier, pour que la raison cite le chemin complet (« donnees.duree_min »).
const creation = z.object({
  donnees: z.object({
    reference: texte,
    statut: z.enum(STATUTS_DEMANDE),
    categorie: texte,
    demandeur: texte,
    ressource: texte,
    debut: z.iso.date(),
    duree_min: z.number().int().positive(),
    cree_le: z.iso.date(),
  }),
});

const miseAJour = z.object({
  donnees: z.object({ reference: texte, statut: z.enum(STATUTS_DEMANDE), commentaire: z.string().trim().nullish() }),
});

const message = z.object({ donnees: z.object({ reference: texte, de: texte, texte }) });

const nuit = z.object({ nuit_du: z.iso.date(), evenements: z.array(z.unknown()) });

// zod 4 ne garde pas la valeur reçue : on la retrouve dans les données pour distinguer « manquant » de « invalide ».
function raisonZod(erreur: z.ZodError, donnees: unknown): string {
  const probleme = erreur.issues[0];
  const champ = probleme.path.join(".");
  if (!champ) return "pas un objet";
  const valeur = probleme.path.reduce<unknown>((objet, cle) => (objet as Record<PropertyKey, unknown> | null | undefined)?.[cle], donnees);
  if (valeur === undefined) return `champ manquant : ${champ}`;
  if (probleme.message === "accent cassé") return `accent cassé : ${champ}`;
  return `champ invalide : ${champ}`;
}

type Lecture =
  | { ok: true; id: string; horodatage: Date; effet: Effet }
  | { ok: false; id: string | null; horodatage: Date | null; raison: string };

// Lit un événement isolé, sans regarder les autres : forme et traduction seulement.
function lireEvenement(brut: unknown): Lecture {
  const tete = entete.safeParse(brut);
  if (!tete.success) {
    const id = typeof (brut as { id?: unknown })?.id === "string" ? (brut as { id: string }).id : null;
    return { ok: false, id, horodatage: null, raison: raisonZod(tete.error, brut) };
  }
  const { id, type } = tete.data;
  const horodatage = new Date(tete.data.horodatage);
  const refuser = (erreur: z.ZodError) => ({ ok: false as const, id, horodatage, raison: raisonZod(erreur, brut) });

  if (type === "creation") {
    const lu = creation.safeParse(brut);
    if (!lu.success) return refuser(lu.error);
    const d = lu.data.donnees;
    return {
      ok: true, id, horodatage,
      effet: {
        type: "creation", reference: d.reference, statut: d.statut, programmateur: d.demandeur, lieu: d.ressource,
        date: d.debut, dureeMinutes: d.duree_min, categorie: d.categorie, recueLe: d.cree_le,
      },
    };
  }
  if (type === "mise_a_jour") {
    const lu = miseAJour.safeParse(brut);
    if (!lu.success) return refuser(lu.error);
    const d = lu.data.donnees;
    return { ok: true, id, horodatage, effet: { type: "changement-statut", reference: d.reference, statut: d.statut, commentaire: d.commentaire || null } };
  }
  if (type === "message") {
    const lu = message.safeParse(brut);
    if (!lu.success) return refuser(lu.error);
    const d = lu.data.donnees;
    return { ok: true, id, horodatage, effet: { type: "message", reference: d.reference, de: d.de, texte: d.texte } };
  }
  return { ok: false, id, horodatage, raison: `type inconnu : ${type}` };
}

// Lit une nuit entière : ne lève jamais d'erreur, un événement cassé n'arrête pas les autres.
export function lireNuit(reponse: unknown, dejaConnu: DejaConnu): NuitLue {
  const enveloppe = nuit.safeParse(reponse);
  if (!enveloppe.success) return { ok: false, raison: `réponse du flux illisible (${raisonZod(enveloppe.error, reponse)})` };

  const lus = enveloppe.data.evenements.map((brut) => ({ brut, lu: lireEvenement(brut) }));
  // Ordre de l'horodatage ; les événements sans horodatage lisible restent à la fin. Le tri est stable.
  lus.sort((a, b) => (a.lu.horodatage?.getTime() ?? Infinity) - (b.lu.horodatage?.getTime() ?? Infinity));

  const ids = new Set(dejaConnu.ids);
  const references = new Set(dejaConnu.references);
  const evenements = lus.map(({ brut, lu }): EvenementLu => {
    if (!lu.ok) return { etat: "mis-de-cote", id: lu.id, horodatage: lu.horodatage, raison: lu.raison, brut };
    const { id, horodatage, effet } = lu;
    if (ids.has(id)) return { etat: "doublon", id, horodatage, brut };
    ids.add(id);
    if (effet.type === "creation") {
      // Référence déjà reçue : rien n'est écrasé.
      if (references.has(effet.reference)) return { etat: "doublon", id, horodatage, brut };
      references.add(effet.reference);
    } else if (!references.has(effet.reference)) {
      return { etat: "mis-de-cote", id, horodatage, raison: `référence inconnue : ${effet.reference}`, brut };
    }
    return { etat: "a-traiter", id, horodatage, effet, brut };
  });

  return { ok: true, nuitDu: enveloppe.data.nuit_du, evenements };
}

// Première nuit rattrapée (décidé le 17/10).
export const PREMIERE_NUIT = "2026-09-20";

// Plus ancienne nuit pas encore importée avec succès depuis la première ; si toutes le sont, la nuit qui vient de finir
// (`aujourdhui`, heure de Paris). Importer dans l'ordre : une mise à jour lue avant sa création serait perdue.
export function prochaineNuit(reussies: ReadonlySet<string>, aujourdhui: string): string {
  for (let jour = PREMIERE_NUIT; jour < aujourdhui; jour = lendemain(jour)) {
    if (!reussies.has(jour)) return jour;
  }
  return aujourdhui;
}

function lendemain(jour: string): string {
  const d = new Date(`${jour}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export type Compteurs = { recus: number; doublons: number; traites: number; misDeCote: number };

// Ce qu'on écrit d'une nuit lue : un id déjà en base (ou déjà vu cette nuit) n'est que compté comme doublon.
export function bilanNuit(evenements: EvenementLu[], idsEnBase: ReadonlySet<string>) {
  const vus = new Set(idsEnBase);
  const aEcrire: EvenementLu[] = [];
  const compteurs: Compteurs = { recus: evenements.length, doublons: 0, traites: 0, misDeCote: 0 };
  for (const evenement of evenements) {
    if (evenement.id !== null && vus.has(evenement.id)) {
      compteurs.doublons++;
      continue;
    }
    if (evenement.id !== null) vus.add(evenement.id);
    aEcrire.push(evenement);
    if (evenement.etat === "doublon") compteurs.doublons++;
    else if (evenement.etat === "a-traiter") compteurs.traites++;
    else compteurs.misDeCote++;
  }
  return { aEcrire, compteurs };
}
