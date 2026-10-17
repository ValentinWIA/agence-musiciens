import { afterEach, describe, expect, it, vi } from "vitest";
import { DELAI_BASE_MS, verifierSante } from "./sante";

describe("santé du site", () => {
  afterEach(() => vi.useRealTimers());

  it("sans ?base=1, répond ok sans jamais interroger la base (pas de réveil de Neon)", async () => {
    const interrogerBase = vi.fn();
    expect(await verifierSante(false, interrogerBase)).toBe(true);
    expect(interrogerBase).not.toHaveBeenCalled();
  });

  it("avec ?base=1, répond ok quand la base répond", async () => {
    expect(await verifierSante(true, async () => [{ "?column?": 1 }])).toBe(true);
  });

  it("avec ?base=1, répond en panne quand la base renvoie une erreur", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await verifierSante(true, async () => Promise.reject(new Error("connexion refusée")))).toBe(false);
  });

  it("avec ?base=1, répond en panne quand la base ne répond pas à temps", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const reponse = verifierSante(true, () => new Promise(() => {}));
    await vi.advanceTimersByTimeAsync(DELAI_BASE_MS);
    expect(await reponse).toBe(false);
  });
});
