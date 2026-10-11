import { describe, expect, it, vi } from "vitest";
import { chercherAdresse } from "./geocodage";

// Faux service : renvoie la réponse donnée, sans appel réseau.
function fauxService(corps: unknown, statut = 200) {
  return vi.fn<typeof fetch>(async () => new Response(JSON.stringify(corps), { status: statut }));
}

const salleCortot = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [2.3046, 48.8836] },
      properties: { label: "78 Rue Cardinet 75017 Paris", score: 0.95 },
    },
  ],
};

describe("géocodage d'une adresse", () => {
  it("renvoie les propositions, latitude et longitude dans le bon ordre (cas normal)", async () => {
    const service = fauxService(salleCortot);
    const resultat = await chercherAdresse("78 rue Cardinet Paris", service);
    expect(resultat).toEqual({
      ok: true,
      propositions: [{ libelle: "78 Rue Cardinet 75017 Paris", latitude: 48.8836, longitude: 2.3046 }],
    });
    expect(String(service.mock.calls[0][0])).toContain("q=78+rue+Cardinet+Paris");
  });

  it("renvoie une liste vide quand l'adresse est inconnue (cas vide)", async () => {
    const resultat = await chercherAdresse("zzzz introuvable", fauxService({ features: [] }));
    expect(resultat).toEqual({ ok: true, propositions: [] });
  });

  it("refuse une saisie de moins de 3 caractères sans appeler le service", async () => {
    const service = fauxService(salleCortot);
    expect(await chercherAdresse("  ab ", service)).toEqual({ ok: false, raison: "saisie-trop-courte" });
    expect(service).not.toHaveBeenCalled();
  });

  it("signale une réponse mal formée (cas piégé)", async () => {
    const malFormee = { features: [{ geometry: { coordinates: ["2,30", 48.88] }, properties: {} }] };
    expect(await chercherAdresse("78 rue Cardinet", fauxService(malFormee))).toEqual({
      ok: false,
      raison: "reponse-invalide",
    });
  });

  it("signale le service indisponible : erreur HTTP, panne réseau ou délai dépassé", async () => {
    expect(await chercherAdresse("78 rue Cardinet", fauxService({}, 503))).toEqual({
      ok: false,
      raison: "indisponible",
    });
    const delaiDepasse = vi.fn(async () => {
      throw new DOMException("délai dépassé", "TimeoutError");
    });
    expect(await chercherAdresse("78 rue Cardinet", delaiDepasse)).toEqual({ ok: false, raison: "indisponible" });
  });
});
