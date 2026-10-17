import { describe, expect, it, vi } from "vitest";
import { appelerFlux, ATTENTES_MS, type Outils } from "./appel-flux";

const nuit = { nuit_du: "2026-09-20", evenements: [] };
const repondre = (corps: unknown, statut = 200) => new Response(JSON.stringify(corps), { status: statut });
const lenteur = () => Object.assign(new Error("délai"), { name: "TimeoutError" });

// Faux serveur : rend les réponses données, une par appel ; une Error est levée (panne réseau, délai).
function fauxFlux(...reponses: (Response | Error)[]) {
  const attentes: number[] = [];
  const outils: Outils = {
    fetch: vi.fn<typeof fetch>(async () => {
      const r = reponses.shift()!;
      if (r instanceof Error) throw r;
      return r;
    }),
    attendre: async (ms) => void attentes.push(ms), // pas de vraie attente
  };
  return { outils, attentes };
}

describe("appel au flux de nuit", () => {
  it("rend la nuit au premier essai, avec la date demandée et la clé dans l'en-tête", async () => {
    const { outils, attentes } = fauxFlux(repondre(nuit));
    expect(await appelerFlux("2026-09-20", "cle-test", outils)).toEqual({ ok: true, reponse: nuit, appels: 1 });
    const [adresse, options] = vi.mocked(outils.fetch).mock.calls[0];
    expect(String(adresse)).toContain("sujet=reservations&date=2026-09-20");
    expect(new Headers(options?.headers).get("Authorization")).toBe("Bearer cle-test");
    expect(attentes).toEqual([]);
  });

  it("réessaie après une panne du serveur et réussit au 2e essai", async () => {
    const { outils, attentes } = fauxFlux(repondre({ erreur: "panne" }, 503), repondre(nuit));
    expect(await appelerFlux("2026-09-20", "cle", outils)).toEqual({ ok: true, reponse: nuit, appels: 2 });
    expect(attentes).toEqual([ATTENTES_MS[0]]);
  });

  it("abandonne après 3 essais trop lents, en comptant les 3 appels", async () => {
    const { outils, attentes } = fauxFlux(lenteur(), lenteur(), lenteur());
    expect(await appelerFlux("2026-09-20", "cle", outils)).toEqual({
      ok: false,
      erreur: "pas de réponse en 10 s (3 essais)",
      appels: 3,
    });
    expect(attentes).toEqual(ATTENTES_MS);
  });

  it("réessaie aussi quand le flux est injoignable ou rend une réponse illisible", async () => {
    const { outils } = fauxFlux(new TypeError("fetch failed"), new Response("<html>", { status: 200 }), repondre(nuit));
    expect(await appelerFlux("2026-09-20", "cle", outils)).toMatchObject({ ok: true, appels: 3 });
  });

  it("ne réessaie pas une clé refusée (401) et garde le motif du flux", async () => {
    const { outils, attentes } = fauxFlux(repondre({ erreur: "Clé absente." }, 401));
    expect(await appelerFlux("2026-09-20", "", outils)).toEqual({
      ok: false,
      erreur: "réponse 401 : Clé absente. (1 essai)",
      appels: 1,
    });
    expect(attentes).toEqual([]);
  });

  it("ne réessaie pas une nuit future (400)", async () => {
    const { outils } = fauxFlux(repondre({ erreur: "Cette nuit n'a pas encore eu lieu." }, 400));
    expect(await appelerFlux("2026-12-01", "cle", outils)).toMatchObject({ ok: false, appels: 1 });
  });
});
