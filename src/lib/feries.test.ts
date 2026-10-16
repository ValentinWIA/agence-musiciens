import { describe, expect, it, vi } from "vitest";
import { ferieDuConcert, jourLocal, trouverFerie } from "./feries";

function fauxService(corps: unknown, statut = 200) {
  return vi.fn<typeof fetch>(async () => new Response(JSON.stringify(corps), { status: statut }));
}

const feriesSuisse = [
  { date: "2026-12-25", localName: "Weihnachten", name: "Christmas Day", global: true },
  { date: "2026-01-02", localName: "Berchtoldstag", name: "St. Berchtold's Day", global: false },
];

describe("jourLocal", () => {
  it("prend le jour à l'heure du lieu, pas en UTC (cas piégé)", () => {
    // 24 décembre, 23 h 30 UTC = 25 décembre 0 h 30 à Genève
    expect(jourLocal(new Date("2026-12-24T23:30:00Z"), "Suisse")).toBe("2026-12-25");
  });
});

describe("trouverFerie", () => {
  it("trouve un jour férié national (cas normal), nom anglais hors de France", () => {
    expect(trouverFerie(feriesSuisse, "2026-12-25", "Suisse")).toBe("Christmas Day");
  });
  it("ignore un jour férié d'un seul canton", () => {
    expect(trouverFerie(feriesSuisse, "2026-01-02", "Suisse")).toBeNull();
  });
  it("renvoie null pour une liste vide (cas vide)", () => {
    expect(trouverFerie([], "2026-12-25", "Suisse")).toBeNull();
  });
  it("garde le nom français en France", () => {
    const noel = [{ date: "2026-12-25", localName: "Noël", name: "Christmas Day", global: true }];
    expect(trouverFerie(noel, "2026-12-25", "France")).toBe("Noël");
  });
});

describe("ferieDuConcert", () => {
  it("interroge l'année et le pays du concert", async () => {
    const service = fauxService(feriesSuisse);
    expect(await ferieDuConcert(new Date("2026-12-25T19:00:00Z"), "Suisse", service)).toBe("Christmas Day");
    expect(service.mock.calls[0][0]).toBe("https://date.nager.at/api/v3/PublicHolidays/2026/CH");
  });
  it("service en panne → null, sans planter", async () => {
    expect(await ferieDuConcert(new Date("2026-12-25T19:00:00Z"), "Suisse", fauxService({}, 503))).toBeNull();
  });
  it("réponse mal formée → null", async () => {
    expect(await ferieDuConcert(new Date("2026-12-25T19:00:00Z"), "Suisse", fauxService({ oups: 1 }))).toBeNull();
  });
  it("pays inconnu → null, sans appel", async () => {
    const service = fauxService(feriesSuisse);
    expect(await ferieDuConcert(new Date(), "Atlantide", service)).toBeNull();
    expect(service).not.toHaveBeenCalled();
  });
});
