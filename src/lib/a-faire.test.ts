import { describe, expect, it } from "vitest";
import { contratsAEnvoyer, LIMITE_A_FAIRE, premieres } from "./a-faire";

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
  it("coupe à 5 lignes et compte le reste", () => {
    const { lignes, reste } = premieres([1, 2, 3, 4, 5, 6, 7]);
    expect(lignes).toEqual([1, 2, 3, 4, 5]);
    expect(reste).toBe(2);
    expect(LIMITE_A_FAIRE).toBe(5);
  });

  it("liste courte : tout est montré, rien ne reste", () => {
    expect(premieres([1, 2])).toEqual({ lignes: [1, 2], reste: 0 });
  });
});
