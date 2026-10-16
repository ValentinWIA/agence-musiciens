import { describe, expect, it } from "vitest";
import { compterIndicateurs, libelleSaison, saisonDe, type EngagementCompte } from "./indicateurs";

const saison = { debut: 2026 };

function engagement(modif: Partial<EngagementCompte> = {}): EngagementCompte {
  return { statut: "confirme", debut: new Date("2026-11-16T19:00:00Z"), pays: "France", ...modif };
}

describe("saisonDe", () => {
  it("le 31 août appartient à la saison qui finit, le 1er septembre à la suivante", () => {
    expect(saisonDe(new Date("2026-08-31T18:00:00Z"), "France")).toEqual({ debut: 2025 });
    expect(saisonDe(new Date("2026-09-01T18:00:00Z"), "France")).toEqual({ debut: 2026 });
  });

  it("compte à l'heure du lieu : « automne 2026 » (31 août 22 h UTC) est dans 2026-2027", () => {
    expect(saisonDe(new Date("2026-08-31T22:00:00Z"), "France")).toEqual({ debut: 2026 });
  });

  it("un concert à Tokyo le 1er septembre au matin, encore le 31 août en UTC, est dans la nouvelle saison", () => {
    expect(saisonDe(new Date("2026-08-31T23:00:00Z"), "Japon")).toEqual({ debut: 2026 });
  });

  it("janvier appartient à la saison commencée l'année d'avant", () => {
    expect(saisonDe(new Date("2027-01-15T12:00:00Z"), "France")).toEqual({ debut: 2026 });
    expect(libelleSaison({ debut: 2026 })).toBe("2026-2027");
  });
});

describe("compterIndicateurs", () => {
  it("aucun engagement : des zéros partout", () => {
    const r = compterIndicateurs([], saison);
    expect(r.contrats).toBe(0);
    expect(r.total).toBe(0);
    expect(Object.values(r.parStatut).every((n) => n === 0)).toBe(true);
    expect(Object.keys(r.parStatut)).toHaveLength(8);
  });

  it("compte comme contrat tout ce qui a passé « contrat envoyé », sauf l'annulé", () => {
    const statuts = ["demande", "option", "contrat_envoye", "confirme", "joue", "facture", "paye", "annule"] as const;
    const r = compterIndicateurs(statuts.map((statut) => engagement({ statut })), saison);
    expect(r.contrats).toBe(5);
    expect(r.total).toBe(8);
    expect(r.parStatut.annule).toBe(1);
  });

  it("ignore les engagements des autres saisons", () => {
    const r = compterIndicateurs(
      [engagement(), engagement({ debut: new Date("2026-06-10T19:00:00Z") }), engagement({ debut: new Date("2027-09-10T19:00:00Z") })],
      saison,
    );
    expect(r.contrats).toBe(1);
    expect(r.parStatut.confirme).toBe(1);
  });
});
