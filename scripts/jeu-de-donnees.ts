// Remplace les données de démonstration par le jeu fictif de scripts/donnees-fictives.ts.
// Rejouable : chaque exécution produit le même jeu. Le compte de l'agent (admin) n'est jamais touché.
//
//   npm run donnees                       → sur la base indiquée par DATABASE_URL_UNPOOLED
//   … --si-previsualisation               → seulement sur une prévisualisation Vercel (utilisé par vercel-build)

import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { and, eq, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";
import { versUniteMinimale } from "@/lib/argent";
import { regleMotDePasse } from "@/lib/mot-de-passe";
import { ENGAGEMENTS, LIEUX, MUSICIENS, PROGRAMMATEURS } from "./donnees-fictives";

const { engagementMusiciens, engagements, invitations, lieux, programmateurs, reinitialisations, utilisateurs } = schema;
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

  // Identifiants fixés ici pour relier les lignes entre elles dans une seule opération.
  const ids = <K extends string>(cles: Record<K, unknown>) =>
    Object.fromEntries(Object.keys(cles).map((cle) => [cle, randomUUID()])) as Record<K, string>;
  const idMusicien = ids(MUSICIENS);
  const idLieu = ids(LIEUX);
  const idProgrammateur = ids(PROGRAMMATEURS);

  const hash = await bcrypt.hash(motDePasse.data, 12);
  const anciensMusiciens = db
    .select({ id: utilisateurs.id })
    .from(utilisateurs)
    .where(and(like(utilisateurs.email, DOMAINE_FICTIF), eq(utilisateurs.role, "musicien")));

  const lignesEngagements = ENGAGEMENTS.map((e) => {
    const devise = e.devise ?? "EUR";
    const cachet = e.cachet === undefined ? null : versUniteMinimale(e.cachet, devise);
    if (cachet === null && e.cachet !== undefined) throw new Error(`Cachet invalide : ${e.cachet} ${devise}`);
    return {
      id: randomUUID(),
      titre: e.titre ?? null,
      debut: new Date(e.debut),
      precisionDate: e.precision ?? "jour",
      dureeMinutes: e.duree ?? null,
      lieuId: idLieu[e.lieu],
      programmateurId: idProgrammateur[e.programmateur],
      statut: e.statut,
      cachet,
      devise,
      programme: e.programme ?? null,
      notes: e.notes ?? null,
    };
  });

  // Tout est effacé puis recréé en une seule opération : en cas d'erreur, rien n'a changé.
  await db.batch([
    db.delete(engagements), // les musiciens des engagements partent avec eux (cascade)
    db.delete(lieux),
    db.delete(programmateurs),
    db.delete(reinitialisations).where(inArray(reinitialisations.utilisateurId, anciensMusiciens)),
    db.delete(invitations).where(like(invitations.email, DOMAINE_FICTIF)),
    db.delete(utilisateurs).where(and(like(utilisateurs.email, DOMAINE_FICTIF), eq(utilisateurs.role, "musicien"))),
    db.insert(utilisateurs).values(
      Object.entries(MUSICIENS).map(([cle, m]) => ({
        id: idMusicien[cle as keyof typeof MUSICIENS],
        ...m,
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

principal().catch((erreur) => {
  console.error(`Jeu de données : échec — ${erreur.message}`);
  process.exit(1);
});
