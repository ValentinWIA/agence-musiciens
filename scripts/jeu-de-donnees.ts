// Remplace les données de démonstration par le jeu fictif de scripts/donnees-fictives.ts.
// Rejouable : chaque exécution produit le même jeu. Le compte de l'agent (admin) n'est jamais touché.
//
//   npm run donnees                       → sur la base indiquée par DATABASE_URL_UNPOOLED
//   … --si-previsualisation               → seulement sur une prévisualisation Vercel (utilisé par vercel-build)

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { and, eq, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";
import { versUniteMinimale } from "@/lib/argent";
import { typeDePhoto } from "@/lib/musiciens";
import { regleMotDePasse } from "@/lib/mot-de-passe";
import { ENGAGEMENTS, LIEUX, MUSICIENS, PROGRAMMATEURS } from "./donnees-fictives";

const {
  demandesRecues, engagementMusiciens, engagements, evenementsFlux, executions, invitations, lieux, programmateurs,
  reinitialisations, utilisateurs,
} = schema;
const DOMAINE_FICTIF = "%@agence-musiciens.test";

async function principal() {
  if (process.argv.includes("--si-previsualisation") && process.env.VERCEL_ENV !== "preview") {
    console.log("Jeu de données : ignoré (pas une prévisualisation).");
    return;
  }

  const motDePasse = regleMotDePasse.safeParse(process.env.MOT_DE_PASSE_DEMO);
  if (!motDePasse.success) throw new Error("MOT_DE_PASSE_DEMO absent ou trop court (12 caractères minimum).");

  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL_UNPOOLED absente : impossible de savoir quelle base remplir.");
  const db = drizzle(neon(url), { schema });

  // Identifiants fixes, calculés à partir du nom de chaque élément : identiques à chaque exécution, pour que les
  // sessions ouvertes et les adresses des fiches restent valables après un rechargement du jeu.
  const ids = <K extends string>(famille: string, cles: Record<K, unknown>) =>
    Object.fromEntries(Object.keys(cles).map((cle) => [cle, idStable(`${famille}:${cle}`)])) as Record<K, string>;
  const idMusicien = ids("musicien", MUSICIENS);
  const idLieu = ids("lieu", LIEUX);
  const idProgrammateur = ids("programmateur", PROGRAMMATEURS);

  const hash = await bcrypt.hash(motDePasse.data, 12);
  const anciensMusiciens = db
    .select({ id: utilisateurs.id })
    .from(utilisateurs)
    .where(and(like(utilisateurs.email, DOMAINE_FICTIF), eq(utilisateurs.role, "musicien")));

  const lignesEngagements = ENGAGEMENTS.map((e, i) => {
    const devise = e.devise ?? "EUR";
    const cachet = e.cachet === undefined ? null : versUniteMinimale(e.cachet, devise);
    if (cachet === null && e.cachet !== undefined) throw new Error(`Cachet invalide : ${e.cachet} ${devise}`);
    return {
      id: idStable(`engagement:${i}`),
      titre: e.titre ?? null,
      debut: new Date(e.debut),
      precisionDate: e.precision ?? "jour",
      dureeMinutes: e.duree ?? null,
      lieuId: idLieu[e.lieu],
      programmateurId: idProgrammateur[e.programmateur],
      statut: e.statut,
      statutAvantAnnulation: e.avantAnnulation ?? null,
      cachet,
      devise,
      programme: e.programme ?? null,
      notes: e.notes ?? null,
    };
  });

  const portraits = await envoyerPortraits(Object.keys(MUSICIENS) as (keyof typeof MUSICIENS)[]);

  // Tout est effacé puis recréé en une seule opération : en cas d'erreur, rien n'a changé.
  await db.batch([
    // Le flux de nuit repart de zéro : un nouvel import le remplit à nouveau, à l'identique.
    db.delete(evenementsFlux),
    db.delete(executions),
    db.delete(demandesRecues),
    db.delete(engagements), // leurs musiciens et leurs pièces jointes partent avec eux (cascade)
    db.delete(lieux),
    db.delete(programmateurs),
    db.delete(reinitialisations).where(inArray(reinitialisations.utilisateurId, anciensMusiciens)),
    db.delete(invitations).where(like(invitations.email, DOMAINE_FICTIF)),
    db.delete(utilisateurs).where(and(like(utilisateurs.email, DOMAINE_FICTIF), eq(utilisateurs.role, "musicien"))),
    db.insert(utilisateurs).values(
      Object.entries(MUSICIENS).map(([cle, m]) => ({
        id: idMusicien[cle as keyof typeof MUSICIENS],
        ...m,
        photoChemin: portraits[cle as keyof typeof MUSICIENS] ?? null,
        role: "musicien" as const,
        motDePasseHash: hash,
      })),
    ),
    db.insert(lieux).values(Object.entries(LIEUX).map(([cle, l]) => ({ id: idLieu[cle as keyof typeof LIEUX], ...l }))),
    db.insert(programmateurs).values(
      Object.entries(PROGRAMMATEURS).map(([cle, p]) => ({ id: idProgrammateur[cle as keyof typeof PROGRAMMATEURS], ...p })),
    ),
    db.insert(engagements).values(lignesEngagements),
    db.insert(engagementMusiciens).values(
      ENGAGEMENTS.flatMap((e, i) => e.musiciens.map((m) => ({ engagementId: lignesEngagements[i].id, musicienId: idMusicien[m] }))),
    ),
  ]);

  console.log(
    `Jeu de données chargé : ${Object.keys(MUSICIENS).length} musiciens, ${Object.keys(PROGRAMMATEURS).length} programmateurs, ` +
      `${Object.keys(LIEUX).length} lieux, ${ENGAGEMENTS.length} engagements.`,
  );
}

// Portraits de démonstration (scripts/portraits/<clé>.jpeg) envoyés au stockage privé à un chemin fixe, remplacé à
// chaque rechargement : pas de fichiers orphelins. Sans stockage (jeton absent, panne), le jeu se charge sans photos.
async function envoyerPortraits<K extends string>(cles: K[]) {
  const chemins: Partial<Record<K, string>> = {};
  // Deux accès possibles : l'ancien jeton, ou OIDC (jeton temporaire de Vercel + identifiant du stockage), seul
  // présent en production depuis octobre 2026.
  const { BLOB_READ_WRITE_TOKEN, VERCEL_OIDC_TOKEN, BLOB_STORE_ID } = process.env;
  if (!BLOB_READ_WRITE_TOKEN && !(VERCEL_OIDC_TOKEN && BLOB_STORE_ID)) {
    console.warn("Portraits : ni BLOB_READ_WRITE_TOKEN ni VERCEL_OIDC_TOKEN + BLOB_STORE_ID, musiciens chargés sans photo.");
    return chemins;
  }
  for (const cle of cles) {
    const contenu = await readFile(path.join(process.cwd(), "scripts/portraits", `${cle}.jpeg`)).catch(() => null);
    const type = contenu && typeDePhoto(contenu.subarray(0, 12));
    if (!contenu || !type) continue;
    const chemin = `musiciens/demo/${cle}.jpeg`;
    try {
      await put(chemin, contenu, { access: "private", contentType: type, addRandomSuffix: false, allowOverwrite: true });
      chemins[cle] = chemin;
    } catch (e) {
      console.warn(`Portrait de ${cle} non envoyé :`, e);
    }
  }
  console.log(`Portraits envoyés : ${Object.keys(chemins).length}.`);
  return chemins;
}

// Empreinte du nom mise en forme d'UUID (version 5, variante RFC) : même nom → même identifiant.
function idStable(nom: string) {
  const h = createHash("sha256").update(`agence-musiciens:${nom}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

principal().catch((erreur) => {
  console.error(`Jeu de données : échec — ${erreur.message}`);
  process.exit(1);
});
