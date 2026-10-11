"use server";

import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { engagementMusiciens, engagements, lieux, programmateurs, utilisateurs } from "@/db/schema";
import { DEVISES, versUniteMinimale } from "@/lib/argent";
import { lireSaisieDate, SAISONS_SAISIE, type Saison, type SaisieDate } from "@/lib/dates";
import { verifierAdmin } from "@/lib/session";

const texteFacultatif = (max: number) =>
  z.string().trim().max(max, { error: `${max} caractères au plus.` }).transform((t) => t || null);

const schemaEngagement = z.object({
  titre: texteFacultatif(120),
  precision: z.enum(["jour", "mois", "saison"], { error: "Choisissez le type de date." }),
  jour: z.string(),
  heure: z.string(),
  mois: z.string(),
  saison: z.string(),
  annee: z.string(),
  duree: z
    .string()
    .trim()
    .refine((t) => t === "" || /^\d+$/.test(t), { error: "Durée en minutes, nombre entier." })
    .transform((t) => (t ? Number(t) : null))
    .refine((n) => n === null || (n > 0 && n <= 24 * 60), { error: "Durée entre 1 et 1 440 minutes." }),
  lieuId: z.uuid({ error: "Choisissez un lieu." }),
  programmateurId: z.uuid({ error: "Choisissez un programmateur." }),
  musiciens: z
    .array(z.uuid())
    .min(1, { error: "Choisissez au moins un musicien." })
    .max(2, { error: "Deux musiciens au plus (solo ou duo)." }),
  cachet: z.string().trim(),
  devise: z.enum(DEVISES, { error: "Devise inconnue." }),
  programme: texteFacultatif(5000),
  notes: texteFacultatif(5000),
});

type Champ = keyof z.infer<typeof schemaEngagement> | "date";
export type EtatCreation = {
  erreurs?: Partial<Record<Champ, string[]>>;
};

// Les champs de date utiles selon la précision choisie ; null si la saisie est incomplète ou invalide.
function saisieDate(d: { precision: string; jour: string; heure: string; mois: string; saison: string; annee: string }): SaisieDate | null {
  if (d.precision === "jour") {
    return /^\d{4}-\d{2}-\d{2}$/.test(d.jour) && /^\d{2}:\d{2}$/.test(d.heure)
      ? { precision: "jour", jour: d.jour, heure: d.heure }
      : null;
  }
  if (d.precision === "mois") return /^\d{4}-\d{2}$/.test(d.mois) ? { precision: "mois", mois: d.mois } : null;
  return d.saison in SAISONS_SAISIE && /^\d{4}$/.test(d.annee)
    ? { precision: "saison", saison: d.saison as Saison, annee: Number(d.annee) }
    : null;
}

export async function creerEngagement(_etat: EtatCreation, formData: FormData): Promise<EtatCreation> {
  const agent = await verifierAdmin("/engagements/nouveau (création)");

  const donnees = schemaEngagement.safeParse({ ...Object.fromEntries(formData), musiciens: formData.getAll("musiciens") });
  if (!donnees.success) return { erreurs: z.flattenError(donnees.error).fieldErrors };
  const d = donnees.data;

  const erreurs: EtatCreation["erreurs"] = {};
  const cachet = d.cachet === "" ? null : versUniteMinimale(d.cachet, d.devise);
  if (cachet === null && d.cachet !== "") {
    erreurs.cachet = [d.devise === "JPY" ? "Montant en yens sans centimes, positif." : "Montant positif, deux décimales au plus."];
  }
  const date = saisieDate(d);
  if (!date) erreurs.date = ["Date incomplète."];

  // On relit en base tout ce que le navigateur a envoyé : un identifiant peut avoir été inventé.
  const [lieu, programmateur, musiciens] = await Promise.all([
    db.query.lieux.findFirst({ where: eq(lieux.id, d.lieuId) }),
    db.query.programmateurs.findFirst({ where: eq(programmateurs.id, d.programmateurId) }),
    db
      .select({ id: utilisateurs.id })
      .from(utilisateurs)
      .where(and(inArray(utilisateurs.id, d.musiciens), eq(utilisateurs.role, "musicien"))),
  ]);
  if (!lieu) erreurs.lieuId = ["Lieu introuvable."];
  if (!programmateur) erreurs.programmateurId = ["Programmateur introuvable."];
  if (musiciens.length !== new Set(d.musiciens).size) erreurs.musiciens = ["Musicien introuvable."];

  // La date se lit à l'heure du lieu : on a besoin du lieu pour la convertir.
  const periode = date && lieu ? lireSaisieDate(date, lieu.pays) : null;
  if (periode && periode.finPeriode <= new Date()) erreurs.date = ["Cette date est déjà passée."];

  if (Object.keys(erreurs).length || !periode) {
    console.warn(`Création d'engagement refusée (${Object.keys(erreurs).join(", ")}) par ${agent.nom}`);
    return { erreurs };
  }

  // L'identifiant est tiré ici pour écrire l'engagement et ses musiciens en une seule opération indivisible.
  const id = crypto.randomUUID();
  await db.batch([
    db.insert(engagements).values({
      id,
      titre: d.titre,
      debut: periode.debut,
      precisionDate: d.precision,
      dureeMinutes: d.duree,
      lieuId: d.lieuId,
      programmateurId: d.programmateurId,
      cachet,
      devise: d.devise,
      programme: d.programme,
      notes: d.notes,
    }),
    db.insert(engagementMusiciens).values(musiciens.map((m) => ({ engagementId: id, musicienId: m.id }))),
  ]);

  console.log(`Engagement créé : ${id} (${lieu!.nom}, ${musiciens.length} musicien(s)) par ${agent.nom}`);
  redirect(`/engagements/${id}?cree=1`);
}
