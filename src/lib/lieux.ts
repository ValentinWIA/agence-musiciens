import { z } from "zod";
import { PAYS } from "@/lib/dates";

// Vérification des champs d'un nouveau lieu (séparée de l'action serveur pour être testée).

const texte = (nom: string, max: number) =>
  z.string().trim().min(1, { error: `${nom} obligatoire.` }).max(max, { error: `${max} caractères au plus.` });

const coordonnee = (nom: string, max: number) =>
  z
    .string()
    .trim()
    .refine((t) => /^-?\d+(\.\d+)?$/.test(t), { error: `${nom} : un nombre, avec un point (ex. 48.8566).` })
    .transform(Number)
    .refine((n) => Math.abs(n) <= max, { error: `${nom} entre -${max} et ${max}.` });

const schemaLieu = z.object({
  nom: texte("Nom", 120),
  adresse: texte("Adresse", 200),
  ville: texte("Ville", 100),
  pays: z.enum(PAYS, { error: "Choisissez un pays de la liste." }),
  latitude: coordonnee("Latitude", 90),
  longitude: coordonnee("Longitude", 180),
});

export type ErreursLieu = Partial<Record<keyof z.infer<typeof schemaLieu>, string[]>>;
export function lireLieu(donnees: Record<string, unknown>) {
  const lu = schemaLieu.safeParse(donnees);
  if (!lu.success) return { erreurs: z.flattenError(lu.error).fieldErrors as ErreursLieu };
  return { lieu: lu.data };
}

type Repere = { nom: string; ville: string; latitude: number; longitude: number };

const normaliserNom = (t: string) => t.trim().replace(/\s+/g, " ").toLowerCase();
// Le code postal est souvent ajouté à la ville, avant ou après : on l'ignore.
const normaliserVille = (t: string) => normaliserNom(t.replace(/\d/g, " "));

// Distance approchée (projection plate) : précise à quelques mètres sur de courtes distances,
// suffisante pour dire si deux lieux sont au même endroit. Le vrai calcul de trajet viendra à l'étape F.
export function distanceApprocheeMetres(a: Repere, b: Repere) {
  const radians = (deg: number) => (deg * Math.PI) / 180;
  const x = radians(b.longitude - a.longitude) * Math.cos(radians((a.latitude + b.latitude) / 2));
  const y = radians(b.latitude - a.latitude);
  return Math.hypot(x, y) * 6_371_000;
}

const RAYON_DOUBLON_M = 100;

// Même nom, et même ville (sans chiffres) ou même endroit (moins de 100 m).
export function trouverDoublon<T extends Repere>(nouveau: Repere, existants: T[]): T | undefined {
  const nom = normaliserNom(nouveau.nom);
  return existants.find(
    (l) =>
      normaliserNom(l.nom) === nom &&
      (normaliserVille(l.ville) === normaliserVille(nouveau.ville) || distanceApprocheeMetres(l, nouveau) < RAYON_DOUBLON_M),
  );
}
