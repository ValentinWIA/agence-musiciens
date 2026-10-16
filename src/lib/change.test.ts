import { describe, expect, it, vi } from "vitest";
import { convertirEnEur, lireTaux, type Taux } from "./change";

function fauxService(corps: unknown, statut = 200) {
  return vi.fn<typeof fetch>(async () => new Response(JSON.stringify(corps), { status: statut }));
}

const taux: Taux = { date: "2026-10-15", rates: { CHF: 0.9305, USD: 1.1208, GBP: 0.8461, JPY: 177.06 } };

describe("convertirEnEur", () => {
  it("convertit des centimes de franc suisse en centimes d'euro (cas normal)", () => {
    expect(convertirEnEur(300000, "CHF", taux)).toBe(322407); // 3 000 CHF → 3 224,07 €
  });
  it("tient compte des yens sans centimes (cas piégé)", () => {
    expect(convertirEnEur(500000, "JPY", taux)).toBe(282390); // 500 000 ¥ → 2 823,90 €
  });
  it("un cachet nul reste nul (cas vide)", () => {
    expect(convertirEnEur(0, "GBP", taux)).toBe(0);
  });
});

describe("lireTaux", () => {
  it("lit la réponse de Frankfurter", async () => {
    expect(await lireTaux(fauxService({ amount: 1, base: "EUR", ...taux }))).toEqual(taux);
  });
  it("service en panne → null", async () => {
    expect(await lireTaux(fauxService({}, 503))).toBeNull();
  });
  it("taux nul ou négatif refusé (évite une division par zéro)", async () => {
    expect(await lireTaux(fauxService({ date: "2026-10-15", rates: { ...taux.rates, JPY: 0 } }))).toBeNull();
  });
});
