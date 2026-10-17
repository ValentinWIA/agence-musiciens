import { formaterMontant, type Devise } from "./argent";
import { ajouterJours, jourLocal, libelleJour, type Jour } from "./calendrier";
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

// musiciens : leurs noms, pour que l'agent suive ses dossiers par artiste ; salle : le nom du lieu.
type Concert = { titre: string | null; debut: Date; pays: string; ville: string; salle: string; musiciens: string[] };
export type OptionPosee = Concert & { expireLe: Jour };
export type ConcertPasse = Concert & { statut: Statut; cachet: number | null; devise: Devise };

// Option à relancer : l'échéance tombe dans les 7 jours, ou elle est passée et l'option n'a pas bougé.
// Même règle pour le récap et pour l'échéance en orange sur la fiche.
export function optionARelancer(expireLe: Jour, aujourdhui: Jour): boolean {
  return expireLe <= ajouterJours(aujourdhui, JOURS_AVANT_EXPIRATION);
}

export function optionsQuiExpirent<T extends OptionPosee>(options: T[], aujourdhui: Jour): T[] {
  return options.filter((o) => optionARelancer(o.expireLe, aujourdhui)).sort((a, b) => a.expireLe.localeCompare(b.expireLe));
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

const SEPARATEUR = "━".repeat(24);

// Ordre validé le 17/10 : en bref, puis ce qui demande une action, puis ce que le flux a apporté, puis l'import.
export function composerRecap(d: DonneesRecap): { sujet: string; texte: string } {
  const panne = d.nuits.some((n) => n.etat === "en_echec");
  const sujet = `Récap du matin — ${libelleJour(d.aujourdhui)}${panne ? " (import en échec)" : ""}`;

  const enBref = [
    compte(d.options.length, "option à relancer", "options à relancer"),
    compte(d.impayes.length, "cachet impayé", "cachets impayés"),
    compte(d.messages.length, "message à lire", "messages à lire"),
    compte(d.demandes.length, "nouvelle demande", "nouvelles demandes"),
    compte(d.changements.length, "changement de statut", "changements de statut"),
    compte(d.messagesInconnus.length, "message pour une demande inconnue", "messages pour une demande inconnue"),
  ].filter((l) => l !== null);

  const aFaire = groupe("À faire", [
    section(
      "Options à relancer",
      d.options.map((o) => {
        const echeance = o.expireLe < d.aujourdhui ? `option expirée le ${jourMois(o.expireLe)}` : `option jusqu'au ${jourAbrege(o.expireLe, false)}`;
        return `${presenter(o)}\n  concert le ${jourAbrege(jourLocal(o.debut, o.pays))} · ${echeance}`;
      }),
    ),
    section(
      "Cachets impayés",
      d.impayes.map((c) => {
        const jour = jourLocal(c.debut, c.pays);
        return (
          `${presenter(c)}\n  joué le ${jourCourt(jour)} · ${formaterMontant(c.cachet!, c.devise)} · ` +
          `${LIBELLES_STATUT[c.statut]}, il y a ${ecartEnJours(jour, d.aujourdhui)} jours`
        );
      }),
    ),
    section("Messages à lire", d.messages.map(ligneMessage)),
  ]);

  const recuDuFlux = groupe("Reçu du flux", [
    section("Nouvelles demandes", d.demandes.map((x) => `${x.programmateur} — ${x.lieu}, le ${jourAbrege(x.date)} (réf. ${x.reference})`)),
    section(
      "Changements de statut",
      d.changements.map((x) =>
        x.engagementCree
          ? `${x.reference} : le programmateur dit « ${LIBELLES_DEMANDE[x.statut]} »\n  l'engagement n'a pas changé : à vérifier`
          : `${x.reference} : ${LIBELLES_DEMANDE[x.statut]}${x.commentaire ? ` — « ${x.commentaire} »` : ""}`,
      ),
    ),
    section("Messages pour une demande inconnue", d.messagesInconnus.map(ligneMessage)),
  ]);

  const texte = [
    `Bonjour ${d.nomAgent},`,
    enBref.length ? `EN BREF\n${enBref.map((l) => `• ${l}`).join("\n")}` : "Rien de neuf cette nuit.",
    aFaire,
    recuDuFlux,
    `${SEPARATEUR}\nIMPORT\n${bilan(d)}`,
    "Rien n'a été fait automatiquement : les messages sont recopiés tels quels.\n" +
      `Ouvrir CM Management : ${d.lienSite}`,
  ]
    .filter((bloc) => bloc !== null)
    .join("\n\n");
  return { sujet, texte };
}

// Les nuits réussies en une phrase ; une nuit en échec garde sa ligne, avec la raison.
function bilan(d: DonneesRecap): string {
  if (!d.nuits.length) return "Aucune nuit importée depuis le dernier récap.";
  const lignes: string[] = [];
  const reussies = d.nuits.filter((n) => n.etat === "reussie");
  if (reussies.length) {
    const somme = (cle: "recus" | "doublons" | "misDeCote") => reussies.reduce((total, n) => total + n[cle], 0);
    const quoi =
      reussies.length === 1
        ? `Nuit du ${jourMois(reussies[0].nuitDu)} importée`
        : `${reussies.length} nuits importées (du ${jourMois(reussies[0].nuitDu)} au ${jourMois(reussies.at(-1)!.nuitDu)})`;
    const raisons = regrouperRaisons(d.raisons);
    const detail = raisons.length ? ` (${raisons.map((r) => `${r.raison} : ${r.nombre}`).join(", ")})` : "";
    lignes.push(`${quoi} : ${somme("recus")} reçus, ${somme("doublons")} doublons, ${somme("misDeCote")} mis de côté${detail}.`);
  }
  for (const n of d.nuits.filter((n) => n.etat === "en_echec")) {
    lignes.push(`Nuit du ${jourMois(n.nuitDu)} : import en échec (${n.erreur ?? "raison inconnue"}), elle sera réessayée.`);
  }
  if (d.raisons.length) lignes.push(`Détail des événements mis de côté : ${d.lienSite}/nuit`);
  return lignes.join("\n");
}

function groupe(titre: string, sections: (string | null)[]): string | null {
  const pleines = sections.filter((s) => s !== null);
  return pleines.length ? `${SEPARATEUR}\n${titre.toUpperCase()}\n\n${pleines.join("\n\n")}` : null;
}

function section(titre: string, lignes: string[]): string | null {
  if (!lignes.length) return null;
  return `${titre}\n${limiter(lignes).map((l) => `• ${l}`).join("\n")}`;
}

function limiter(lignes: string[]): string[] {
  if (lignes.length <= LIMITE_LISTE) return lignes;
  return [...lignes.slice(0, LIMITE_LISTE), `… et ${lignes.length - LIMITE_LISTE} autres`];
}

function compte(n: number, singulier: string, pluriel: string): string | null {
  return n ? `${n} ${n > 1 ? pluriel : singulier}` : null;
}

// « Hugo Lambert et Inès Moreau — Duo piano-violon, Tonhalle (Zurich) »
function presenter(c: Concert): string {
  const noms = c.musiciens.length ? c.musiciens.join(" et ") : "Sans musicien";
  return `${noms} — ${c.titre ?? "Sans titre"}, ${c.salle} (${c.ville})`;
}

function ligneMessage(m: Message): string {
  return `${m.de} (réf. ${m.reference}) :\n  « ${m.texte} »`;
}

// « 2026-11-15 » → « 15/11/2026 »
function jourCourt(jour: Jour): string {
  const [a, m, j] = jour.split("-");
  return `${j}/${m}/${a}`;
}

// « 2026-10-22 » → « 22/10 »
function jourMois(jour: Jour): string {
  return jourCourt(jour).slice(0, 5);
}

// « 2026-11-15 » → « dim. 15/11/2026 » (ou « dim. 15/11 » sans l'année)
function jourAbrege(jour: Jour, avecAnnee = true): string {
  const semaine = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" }).format(new Date(`${jour}T12:00:00Z`));
  return `${semaine} ${avecAnnee ? jourCourt(jour) : jourMois(jour)}`;
}

function ecartEnJours(depuis: Jour, jusqua: Jour): number {
  return Math.round((Date.parse(`${jusqua}T12:00:00Z`) - Date.parse(`${depuis}T12:00:00Z`)) / 86_400_000);
}
