import { formaterMontant, type Devise } from "./argent";
import { ajouterJours, jourLocal, libelleJour, type Jour } from "./calendrier";
import { formaterDebut } from "./dates";
import { LIBELLES_STATUT, type Statut } from "./engagements";
import type { StatutDemande } from "./flux";

// Récap du matin envoyé à l'agent (docs/flux-de-nuit.md, section 14). Logique pure : la lecture en base et l'envoi
// sont ailleurs. Les messages des programmateurs sont recopiés en texte, jamais interprétés.

export const JOURS_AVANT_EXPIRATION = 7;
export const JOURS_AVANT_IMPAYE = 30;
export const LIMITE_LISTE = 20;

const LIBELLES_DEMANDE: Record<StatutDemande, string> = {
  demandee: "demandée",
  confirmee: "confirmée",
  terminee: "terminée",
  annulee: "annulée",
};

export type OptionPosee = { titre: string | null; debut: Date; pays: string; ville: string; expireLe: Jour };
export type ConcertPasse = {
  titre: string | null;
  debut: Date;
  pays: string;
  ville: string;
  statut: Statut;
  cachet: number | null;
  devise: Devise;
};

// Options à relancer : l'échéance tombe dans les 7 jours, ou elle est passée et l'option n'a pas bougé.
export function optionsQuiExpirent<T extends OptionPosee>(options: T[], aujourdhui: Jour): T[] {
  const limite = ajouterJours(aujourdhui, JOURS_AVANT_EXPIRATION);
  return options.filter((o) => o.expireLe <= limite).sort((a, b) => a.expireLe.localeCompare(b.expireLe));
}

// Joué ou facturé, et concert passé depuis plus de 30 jours (jour du lieu). Un bénévole (cachet 0) n'attend rien.
export function cachetsImpayes<T extends ConcertPasse>(concerts: T[], aujourdhui: Jour): T[] {
  const limite = ajouterJours(aujourdhui, -JOURS_AVANT_IMPAYE);
  return concerts
    .filter((c) => (c.statut === "joue" || c.statut === "facture") && (c.cachet ?? 0) > 0)
    .filter((c) => jourLocal(c.debut, c.pays) < limite)
    .sort((a, b) => a.debut.getTime() - b.debut.getTime());
}

// « référence inconnue : RES-… » et « référence inconnue : RES-… » ne font qu'une ligne : le détail est sur /nuit.
export function regrouperRaisons(raisons: string[]): { raison: string; nombre: number }[] {
  const comptes = new Map<string, number>();
  for (const r of raisons) {
    const famille = r.split(" : ")[0];
    comptes.set(famille, (comptes.get(famille) ?? 0) + 1);
  }
  return [...comptes].map(([raison, nombre]) => ({ raison, nombre })).sort((a, b) => b.nombre - a.nombre);
}

export type Message = { reference: string; de: string; texte: string };

export type DonneesRecap = {
  aujourdhui: Jour;
  nomAgent: string;
  lienSite: string;
  demandes: { reference: string; programmateur: string; lieu: string; date: Jour }[];
  // engagementCree : la demande est déjà un engagement, que le flux ne modifie jamais.
  changements: { reference: string; statut: StatutDemande; commentaire: string | null; engagementCree: boolean }[];
  messages: Message[];
  messagesInconnus: Message[];
  options: OptionPosee[]; // déjà choisies par optionsQuiExpirent
  impayes: ConcertPasse[]; // déjà choisis par cachetsImpayes
  nuits: { nuitDu: Jour; etat: "reussie" | "en_echec"; recus: number; doublons: number; misDeCote: number; erreur: string | null }[];
  raisons: string[]; // des événements mis de côté
};

export function composerRecap(d: DonneesRecap): { sujet: string; texte: string } {
  const panne = d.nuits.some((n) => n.etat === "en_echec");
  const sujet = `Récap du matin — ${libelleJour(d.aujourdhui)}${panne ? " (import en échec)" : ""}`;

  const sections = [
    section("Demandes reçues", d.demandes.map((x) => `${x.reference} : ${x.programmateur}, ${x.lieu}, le ${jourCourt(x.date)}`)),
    section(
      "Changements de statut",
      d.changements.map((x) =>
        x.engagementCree
          ? `${x.reference} : le programmateur dit « ${LIBELLES_DEMANDE[x.statut]} » ; l'engagement n'a pas changé, à vérifier`
          : `${x.reference} : ${LIBELLES_DEMANDE[x.statut]}${x.commentaire ? ` — « ${x.commentaire} »` : ""}`,
      ),
    ),
    section("Messages à lire", d.messages.map(ligneMessage)),
    section("Messages pour une demande inconnue", d.messagesInconnus.map(ligneMessage)),
    section(
      "Options qui expirent",
      d.options.map((o) => {
        const echeance = o.expireLe < d.aujourdhui ? `expirée le ${jourCourt(o.expireLe)}` : `expire le ${jourCourt(o.expireLe)}`;
        return `${o.titre ?? "Sans titre"}, ${formaterDebut(o.debut, "jour", o.pays)} (${o.ville}) : ${echeance}`;
      }),
    ),
    section(
      "Cachets impayés",
      d.impayes.map(
        (c) =>
          `${c.titre ?? "Sans titre"}, ${formaterDebut(c.debut, "jour", c.pays)} (${c.ville}) : ` +
          `${formaterMontant(c.cachet!, c.devise)}, ${LIBELLES_STATUT[c.statut]}`,
      ),
    ),
  ].filter((s) => s !== null);

  const corps = sections.length ? sections.join("\n\n") : "Rien de neuf cette nuit.";
  const texte = [
    `Bonjour ${d.nomAgent},`,
    corps,
    bilan(d),
    "Les messages sont recopiés tels quels : rien n'a été fait automatiquement.",
    `Ouvrir CM Management : ${d.lienSite}`,
  ].join("\n\n");
  return { sujet, texte };
}

function bilan(d: DonneesRecap): string {
  const lignes = d.nuits.map((n) =>
    n.etat === "en_echec"
      ? `Nuit du ${jourCourt(n.nuitDu)} : import en échec (${n.erreur ?? "raison inconnue"}), il sera réessayé`
      : `Nuit du ${jourCourt(n.nuitDu)} : ${n.recus} reçu(s), ${n.doublons} doublon(s), ${n.misDeCote} mis de côté`,
  );
  if (!d.nuits.length) lignes.push("Aucune nuit importée depuis le dernier récap.");
  const raisons = regrouperRaisons(d.raisons);
  if (raisons.length) lignes.push(`Mis de côté : ${raisons.map((r) => `${r.raison} (${r.nombre})`).join(", ")}`);
  return `IMPORT DES NUITS\n${limiter(lignes).map((l) => `- ${l}`).join("\n")}`;
}

function section(titre: string, lignes: string[]): string | null {
  if (!lignes.length) return null;
  return `${titre.toUpperCase()} (${lignes.length})\n${limiter(lignes).map((l) => `- ${l}`).join("\n")}`;
}

function limiter(lignes: string[]): string[] {
  if (lignes.length <= LIMITE_LISTE) return lignes;
  return [...lignes.slice(0, LIMITE_LISTE), `… et ${lignes.length - LIMITE_LISTE} autres : voir le site`];
}

function ligneMessage(m: Message): string {
  return `${m.reference}, de ${m.de} : « ${m.texte} »`;
}

// « 2026-11-15 » → « 15/11/2026 »
function jourCourt(jour: Jour): string {
  const [a, m, j] = jour.split("-");
  return `${j}/${m}/${a}`;
}
