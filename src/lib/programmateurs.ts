import { z } from "zod";

// Vérification des champs d'un nouveau programmateur (séparée de l'action serveur pour être testée).

const texte = (nom: string, max: number) =>
  z.string().trim().min(1, { error: `${nom} obligatoire.` }).max(max, { error: `${max} caractères au plus.` });

const schemaProgrammateur = z.object({
  nom: texte("Nom", 120),
  // Facultative : vide ou absente → null (rien plutôt qu'un texte vide).
  structure: z
    .string()
    .trim()
    .max(120, { error: "120 caractères au plus." })
    .optional()
    .transform((t) => t || null),
  email: z.string().trim().pipe(z.email({ error: "Adresse e-mail invalide (ex. nom@salle.fr)." }).max(200)),
});

export type ErreursProgrammateur = Partial<Record<keyof z.infer<typeof schemaProgrammateur>, string[]>>;
export function lireProgrammateur(donnees: Record<string, unknown>) {
  const lu = schemaProgrammateur.safeParse(donnees);
  if (!lu.success) return { erreurs: z.flattenError(lu.error).fieldErrors as ErreursProgrammateur };
  return { programmateur: lu.data };
}

// Doublon = même e-mail, casse mise à part. Deux personnes peuvent porter le même nom (décidé le 18/10).
export function trouverDoublonProgrammateur<T extends { email: string }>(email: string, existants: T[]): T | undefined {
  const cherche = email.trim().toLowerCase();
  return existants.find((p) => p.email.trim().toLowerCase() === cherche);
}

// « Sophie Garnier — Saison des salles parisiennes », ou le nom seul sans structure.
export function presenterProgrammateur(p: { nom: string; structure: string | null }): string {
  return p.structure ? `${p.nom} — ${p.structure}` : p.nom;
}
