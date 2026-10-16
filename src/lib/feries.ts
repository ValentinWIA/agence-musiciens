import { z } from "zod";
import { fuseauDuPays } from "./dates";

// Jours fériés du pays du lieu, source Nager.Date (gratuite, sans clé). On avertit, on ne refuse jamais :
// un concert un jour férié est fréquent, mais l'agent doit le savoir (salle, transports, cachet).
// Limite : seuls les jours fériés nationaux comptent (pas ceux d'un seul canton ou d'une seule nation britannique).

const ADRESSE_API = "https://date.nager.at/api/v3/PublicHolidays";
const DELAI_MAX_MS = 5000;
const CODES_PAYS: Record<string, string> = { France: "FR", Suisse: "CH", "Royaume-Uni": "GB", Japon: "JP" };

const reponseApi = z.array(
  z.object({ date: z.string(), localName: z.string(), name: z.string(), global: z.boolean() }),
);
export type JourFerie = z.infer<typeof reponseApi>[number];

// Le jour du concert à l'heure du lieu, au format « 2026-12-25 » (celui de l'API).
export function jourLocal(debut: Date, pays: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: fuseauDuPays(pays) }).format(debut);
}

// Nom du jour férié national qui tombe ce jour-là, ou null. Nom français pour la France, anglais ailleurs.
export function trouverFerie(feries: JourFerie[], jour: string, pays: string): string | null {
  const ferie = feries.find((f) => f.global && f.date === jour);
  if (!ferie) return null;
  return pays === "France" ? ferie.localName : ferie.name;
}

// `appeler` est remplaçable pour que les tests n'interrogent pas le vrai service.
// Service indisponible → null (pas d'avertissement, une ligne dans les journaux).
export async function ferieDuConcert(
  debut: Date,
  pays: string,
  appeler: typeof fetch = fetch,
): Promise<string | null> {
  const code = CODES_PAYS[pays];
  if (!code) return null;
  const jour = jourLocal(debut, pays);
  try {
    const reponse = await appeler(`${ADRESSE_API}/${jour.slice(0, 4)}/${code}`, {
      signal: AbortSignal.timeout(DELAI_MAX_MS),
      next: { revalidate: 86400 }, // la liste d'une année ne change pas : une lecture par jour suffit
    });
    if (!reponse.ok) {
      console.warn(`Jours fériés indisponibles : statut ${reponse.status} (${code})`);
      return null;
    }
    const lecture = reponseApi.safeParse(await reponse.json());
    if (!lecture.success) {
      console.warn(`Jours fériés : réponse mal formée (${code})`);
      return null;
    }
    return trouverFerie(lecture.data, jour, pays);
  } catch (erreur) {
    console.warn(`Jours fériés indisponibles (${code}) : ${(erreur as Error).name}`);
    return null;
  }
}
