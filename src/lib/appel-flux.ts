// Appel au flux de nuit : délai par appel, essais en cas de panne. Ne lève jamais d'erreur.
// fetch et l'attente sont passés en paramètre pour que les tests remplacent le réseau et le temps.

const ADRESSE = "https://flux-de-nuit.vercel.app/api/evenements?sujet=reservations";
export const DELAI_MS = 10_000;
export const ATTENTES_MS = [1_000, 3_000]; // entre le 1er et le 2e essai, puis entre le 2e et le 3e

export type ResultatAppel =
  | { ok: true; reponse: unknown; appels: number }
  | { ok: false; erreur: string; appels: number };

export type Outils = {
  fetch: typeof fetch;
  attendre: (ms: number) => Promise<void>;
};

const outilsReels: Outils = {
  fetch: (...args) => fetch(...args),
  attendre: (ms) => new Promise((fin) => setTimeout(fin, ms)),
};

type Essai = { ok: true; reponse: unknown } | { ok: false; erreur: string; reessayer: boolean };

async function essayer(date: string, cle: string, outils: Outils): Promise<Essai> {
  let res: Response;
  try {
    res = await outils.fetch(`${ADRESSE}&date=${date}`, {
      headers: { Authorization: `Bearer ${cle}` },
      signal: AbortSignal.timeout(DELAI_MS),
      cache: "no-store",
    });
  } catch (e) {
    const lent = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    return { ok: false, erreur: lent ? `pas de réponse en ${DELAI_MS / 1000} s` : "flux injoignable", reessayer: true };
  }
  const corps: unknown = await res.json().catch(() => undefined);
  if (res.ok) {
    if (corps === undefined) return { ok: false, erreur: "réponse illisible", reessayer: true };
    return { ok: true, reponse: corps };
  }
  const motif = (corps as { erreur?: unknown } | undefined)?.erreur;
  const erreur = `réponse ${res.status}${typeof motif === "string" ? ` : ${motif}` : ""}`;
  // Une demande refusée (clé, date) le sera encore au prochain essai : seules les pannes du serveur se réessaient.
  return { ok: false, erreur, reessayer: res.status >= 500 || res.status === 429 };
}

export async function appelerFlux(date: string, cle: string, outils: Outils = outilsReels): Promise<ResultatAppel> {
  let appels = 0;
  for (;;) {
    appels++;
    const essai = await essayer(date, cle, outils);
    if (essai.ok) return { ok: true, reponse: essai.reponse, appels };
    const attente = ATTENTES_MS[appels - 1];
    if (!essai.reessayer || attente === undefined) {
      return { ok: false, erreur: `${essai.erreur} (${appels} essai${appels > 1 ? "s" : ""})`, appels };
    }
    await outils.attendre(attente);
  }
}
