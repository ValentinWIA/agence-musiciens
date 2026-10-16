import { z } from "zod";
import { DECIMALES, type Devise } from "./argent";

// Conversion indicative des cachets en euros, source Frankfurter (taux de référence de la BCE, sans clé).
// On ne range jamais le montant converti : le cachet reste dans sa devise, le taux change chaque jour ouvré.

const ADRESSE_API = "https://api.frankfurter.dev/v1/latest?base=EUR&symbols=CHF,USD,GBP,JPY";
const DELAI_MAX_MS = 5000;

const reponseApi = z.object({
  date: z.string(),
  rates: z.object({ CHF: z.number().positive(), USD: z.number().positive(), GBP: z.number().positive(), JPY: z.number().positive() }),
});
export type Taux = z.infer<typeof reponseApi>;

// 300000 CHF (centimes), 1 € = 0,9305 CHF → 322407 centimes d'euro. Arrondi au centime, une seule fois, à la fin.
export function convertirEnEur(unites: number, devise: Exclude<Devise, "EUR">, taux: Taux): number {
  return Math.round(((unites / 10 ** DECIMALES[devise]) / taux.rates[devise]) * 100);
}

// `appeler` est remplaçable pour que les tests n'interrogent pas le vrai service.
// Service indisponible → null : la fiche affiche le cachet sans conversion.
export async function lireTaux(appeler: typeof fetch = fetch): Promise<Taux | null> {
  try {
    const reponse = await appeler(ADRESSE_API, {
      signal: AbortSignal.timeout(DELAI_MAX_MS),
      next: { revalidate: 3600 }, // la BCE publie une fois par jour : une lecture par heure suffit
    });
    if (!reponse.ok) {
      console.warn(`Taux de change indisponibles : statut ${reponse.status}`);
      return null;
    }
    const lecture = reponseApi.safeParse(await reponse.json());
    if (!lecture.success) {
      console.warn("Taux de change : réponse mal formée");
      return null;
    }
    return lecture.data;
  } catch (erreur) {
    console.warn(`Taux de change indisponibles : ${(erreur as Error).name}`);
    return null;
  }
}
