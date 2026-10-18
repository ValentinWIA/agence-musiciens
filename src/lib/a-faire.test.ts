import { describe, expect, it } from "vitest";
import { contratsAEnvoyer, LIMITE_A_FAIRE, premieres, repartirEnDeuxColonnes } from "./a-faire";

const e = (id: string, statut: string, debut: string) => ({ id, statut, debut: new Date(debut) });

describe("contratsAEnvoyer", () => {
  it("ne garde que les options, le concert le plus proche d'abord", () => {
    const liste = [
      e("a", "option", "2026-12-12T20:00:00Z"),
      e("b", "demande", "2026-11-01T20:00:00Z"),
      e("c", "option", "2026-11-14T20:00:00Z"),
      e("d", "contrat_envoye", "2026-10-30T20:00:00Z"),
    ];
    expect(contratsAEnvoyer(liste).map((x) => x.id)).toEqual(["c", "a"]);
  });

  it("aucune option → liste vide", () => {
    expect(contratsAEnvoyer([e("a", "confirme", "2026-11-14T20:00:00Z")])).toEqual([]);
  });
});

describe("premieres", () => {
  it("coupe à 10 lignes et compte le reste", () => {
    const { lignes, reste } = premieres(Array.from({ length: 12 }, (_, i) => i + 1));
    expect(lignes).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(reste).toBe(2);
    expect(LIMITE_A_FAIRE).toBe(10);
  });

  it("liste courte : tout est montré, rien ne reste", () => {
    expect(premieres([1, 2])).toEqual({ lignes: [1, 2], reste: 0 });
  });
});

describe("repartirEnDeuxColonnes", () => {
  const p = (b: { n: number }) => b.n;

  it("la liste la plus longue seule d'un côté, les courtes ensemble de l'autre", () => {
    const factures = { nom: "factures", n: 4 };
    const contrats = { nom: "contrats", n: 10 };
    const options = { nom: "options", n: 5 };
    const demandes = { nom: "demandes", n: 3 };
    const [g, d] = repartirEnDeuxColonnes([factures, contrats, options, demandes], p);
    expect(g.map((b) => b.nom)).toEqual(["contrats"]);
    expect(d.map((b) => b.nom)).toEqual(["factures", "options", "demandes"]);
  });

  it("garde l'ordre d'origine dans chaque colonne, et rien ne se perd", () => {
    const blocs = [1, 2, 3, 4].map((n) => ({ n }));
    const [g, d] = repartirEnDeuxColonnes(blocs, p);
    expect([...g, ...d].length).toBe(4);
    for (const col of [g, d]) expect(col.map((b) => b.n)).toEqual([...col.map((b) => b.n)].sort());
    expect(Math.abs(g.reduce((t, b) => t + b.n, 0) - d.reduce((t, b) => t + b.n, 0))).toBeLessThanOrEqual(1);
  });

  it("aucune liste → deux colonnes vides", () => {
    expect(repartirEnDeuxColonnes([], p)).toEqual([[], []]);
  });
});
