import { and, asc, desc, eq, gt, inArray, isNotNull, isNull, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { demandesRecues, engagementMusiciens, engagements, evenementsFlux, executions, lieux, recaps, utilisateurs } from "@/db/schema";
import { jourLocal } from "./calendrier";
import { envoyerCourriel } from "./courriel";
import { signalerSansCourriel } from "./envoi-alerte";
import { STATUTS_DEMANDE, type StatutDemande } from "./flux";
import { origineDuSite } from "./origine";
import { cachetsImpayes, composerRecap, optionsQuiExpirent, type Message } from "./recap";

// Envoi du récap du matin (docs/flux-de-nuit.md, section 14) : une seule fois par jour, à l'agent seul.

export type ResultatRecap =
  | { etat: "envoye"; destinataire: string }
  | { etat: "deja-envoye"; envoyeLe: Date | null }
  | { etat: "echec"; erreur: string };

// Un envoi coupé en route (fonction arrêtée) ne doit pas bloquer la journée.
const RESERVATION_PERIMEE = sql`now() - interval '5 minutes'`;

export async function envoyerRecap(declencheur: "cron" | "bouton"): Promise<ResultatRecap> {
  const jour = jourLocal(new Date(), "France");
  await db.delete(recaps).where(and(isNull(recaps.envoyeLe), lt(recaps.creeLe, RESERVATION_PERIMEE)));

  // Le récap précédent (avant la réservation du jour) : tout ce qui a été importé depuis entre dans celui-ci.
  const [precedent] = await db
    .select({ creeLe: recaps.creeLe })
    .from(recaps)
    .where(isNotNull(recaps.envoyeLe))
    .orderBy(desc(recaps.creeLe))
    .limit(1);
  const depuis = precedent?.creeLe ?? new Date(0);

  // La base refuse une seconde ligne pour le même jour : cron et clic simultanés → un seul envoi.
  const reserve = await db.insert(recaps).values({ jour }).onConflictDoNothing().returning({ jour: recaps.jour });
  if (!reserve.length) {
    const [existant] = await db.select({ envoyeLe: recaps.envoyeLe }).from(recaps).where(eq(recaps.jour, jour));
    console.log(`Récap du ${jour} (${declencheur}) : déjà envoyé, rien n'est renvoyé`);
    return { etat: "deja-envoye", envoyeLe: existant?.envoyeLe ?? null };
  }

  const liberer = async (erreur: string): Promise<ResultatRecap> => {
    await db.delete(recaps).where(eq(recaps.jour, jour));
    console.warn(`Récap du ${jour} (${declencheur}) non envoyé : ${erreur}`);
    await signalerSansCourriel(`Récap du ${jour} (${declencheur}) non envoyé : ${erreur}`);
    return { etat: "echec", erreur };
  };

  try {
    const [agent] = await db
      .select({ email: utilisateurs.email, nom: utilisateurs.nom })
      .from(utilisateurs)
      .where(eq(utilisateurs.role, "admin"))
      .limit(1);
    if (!agent) return await liberer("aucun compte agent");

    const { sujet, texte } = composerRecap({
      aujourdhui: jour,
      nomAgent: agent.nom,
      lienSite: origineDuSite(),
      ...(await lireDonnees(depuis, jour)),
    });
    if (!(await envoyerCourriel({ a: agent.email, sujet, texte }))) {
      return await liberer("le courriel n'est pas parti (détail dans le journal Vercel)");
    }
    await db.update(recaps).set({ envoyeLe: new Date(), destinataire: agent.email }).where(eq(recaps.jour, jour));
    console.log(`Récap du ${jour} (${declencheur}) envoyé à l'agent`);
    return { etat: "envoye", destinataire: agent.email };
  } catch (e) {
    return await liberer(e instanceof Error ? e.message : String(e));
  }
}

async function lireDonnees(depuis: Date, jour: string) {
  const nouvelles = gt(executions.debutLe, depuis);
  const [nuits, evenements, options, concerts] = await Promise.all([
    db
      .select()
      .from(executions)
      .where(and(nouvelles, ne(executions.etat, "en_cours")))
      .orderBy(asc(executions.nuitDu), asc(executions.debutLe)),
    db
      .select({
        type: evenementsFlux.type,
        etat: evenementsFlux.etat,
        reference: evenementsFlux.reference,
        raison: evenementsFlux.raison,
        brut: evenementsFlux.brut,
        demande: {
          programmateur: demandesRecues.programmateur,
          lieu: demandesRecues.lieu,
          date: demandesRecues.dateConcert,
          engagementId: demandesRecues.engagementId,
        },
      })
      .from(evenementsFlux)
      .innerJoin(executions, eq(evenementsFlux.executionId, executions.id))
      .leftJoin(demandesRecues, eq(evenementsFlux.reference, demandesRecues.reference))
      .where(and(nouvelles, ne(evenementsFlux.etat, "doublon")))
      .orderBy(asc(evenementsFlux.horodatage)),
    db
      .select({
        id: engagements.id,
        titre: engagements.titre,
        debut: engagements.debut,
        expireLe: engagements.optionExpireLe,
        salle: lieux.nom,
        ville: lieux.ville,
        pays: lieux.pays,
      })
      .from(engagements)
      .innerJoin(lieux, eq(engagements.lieuId, lieux.id))
      .where(and(eq(engagements.statut, "option"), isNotNull(engagements.optionExpireLe))),
    db
      .select({
        id: engagements.id,
        titre: engagements.titre,
        debut: engagements.debut,
        statut: engagements.statut,
        cachet: engagements.cachet,
        devise: engagements.devise,
        salle: lieux.nom,
        ville: lieux.ville,
        pays: lieux.pays,
      })
      .from(engagements)
      .innerJoin(lieux, eq(engagements.lieuId, lieux.id))
      .where(inArray(engagements.statut, ["joue", "facture"])),
  ]);

  // Les musiciens de chaque engagement listé (un ou deux), en une seule requête.
  const ids = [...options, ...concerts].map((e) => e.id);
  const liens = ids.length
    ? await db
        .select({ engagementId: engagementMusiciens.engagementId, nom: utilisateurs.nom })
        .from(engagementMusiciens)
        .innerJoin(utilisateurs, eq(engagementMusiciens.musicienId, utilisateurs.id))
        .where(inArray(engagementMusiciens.engagementId, ids))
        .orderBy(asc(utilisateurs.nom))
    : [];
  const musiciens = (id: string) => liens.filter((l) => l.engagementId === id).map((l) => l.nom);

  const traites = evenements.filter((e) => e.etat === "traite" && e.reference);
  const misDeCote = evenements.filter((e) => e.etat === "mis_de_cote");
  return {
    nuits: nuits.map((n) => ({
      nuitDu: n.nuitDu,
      etat: n.etat as "reussie" | "en_echec",
      recus: n.recus,
      doublons: n.doublons,
      misDeCote: n.misDeCote,
      erreur: n.erreur,
    })),
    demandes: traites
      .filter((e) => e.type === "creation" && e.demande)
      .map(({ reference, demande }) => ({
        reference: reference!,
        programmateur: demande!.programmateur,
        lieu: demande!.lieu,
        date: demande!.date,
      })),
    changements: traites
      .filter((e) => e.type === "mise_a_jour")
      .map((e) => {
        const d = donnees(e.brut);
        return {
          reference: e.reference!,
          statut: lireStatut(d.statut),
          commentaire: typeof d.commentaire === "string" ? d.commentaire : null,
          engagementCree: !!e.demande?.engagementId,
        };
      }),
    messages: traites.filter((e) => e.type === "message").map(lireMessage),
    messagesInconnus: misDeCote
      .filter((e) => e.type === "message" && e.raison?.startsWith("référence inconnue"))
      .map(lireMessage),
    raisons: misDeCote.map((e) => e.raison ?? "raison inconnue"),
    options: optionsQuiExpirent(options.map((o) => ({ ...o, expireLe: o.expireLe!, musiciens: musiciens(o.id) })), jour),
    impayes: cachetsImpayes(concerts.map((c) => ({ ...c, musiciens: musiciens(c.id) })), jour),
  };
}

// L'événement gardé tel quel : ses champs ont été validés à l'import, mais on relit sans rien supposer.
function donnees(brut: unknown): Record<string, unknown> {
  const d = (brut as { donnees?: unknown })?.donnees;
  return d && typeof d === "object" ? (d as Record<string, unknown>) : {};
}

function lireStatut(valeur: unknown): StatutDemande {
  return (STATUTS_DEMANDE as readonly unknown[]).includes(valeur) ? (valeur as StatutDemande) : "demandee";
}

function lireMessage(e: { reference: string | null; brut: unknown }): Message {
  const d = donnees(e.brut);
  return { reference: e.reference ?? "?", de: String(d.de ?? "?"), texte: String(d.texte ?? "") };
}
