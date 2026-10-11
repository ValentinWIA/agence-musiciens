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
