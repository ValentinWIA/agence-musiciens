import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { lieux, programmateurs, utilisateurs } from "@/db/schema";
import { DEVISES, versUniteMinimale } from "@/lib/argent";
import { lireSaisieDate, SAISONS_SAISIE, type Saison, type SaisieDate } from "@/lib/dates";

// La lecture du formulaire d'engagement, commune à la création et à la modification (côté serveur seulement).

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

// Ce qui reste modifiable une fois l'engagement verrouillé (voir estVerrouille).
export const schemaTextes = schemaEngagement.pick({ titre: true, programme: true, notes: true });

type Champ = keyof z.infer<typeof schemaEngagement> | "date";
export type Erreurs = Partial<Record<Champ, string[]>>;
export type EtatFormulaire = { erreurs?: Erreurs; erreur?: string };

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

// Vérifie et convertit le formulaire. Une date passée est refusée, sauf si c'est la date déjà enregistrée
// (`dateActuelle`, en modification) : corriger les notes d'un engagement ne doit pas buter sur sa date.
export async function lireFormulaire(
  formData: FormData,
  dateActuelle?: { debut: Date; precisionDate: string },
) {
  const donnees = schemaEngagement.safeParse({ ...Object.fromEntries(formData), musiciens: formData.getAll("musiciens") });
  if (!donnees.success) return { erreurs: z.flattenError(donnees.error).fieldErrors as Erreurs };
  const d = donnees.data;

  const erreurs: Erreurs = {};
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
  const inchangee =
    periode && dateActuelle?.debut.getTime() === periode.debut.getTime() && dateActuelle.precisionDate === d.precision;
  if (periode && !inchangee && periode.finPeriode <= new Date()) erreurs.date = ["Cette date est déjà passée."];

  if (Object.keys(erreurs).length || !periode || !lieu) return { erreurs };
  return {
    saisie: { ...d, cachet, debut: periode.debut, musiciens: musiciens.map((m) => m.id) },
    lieu,
  };
}
