import { describe, expect, it } from "vitest";
import { compterIndicateurs, libelleSaison, revenusDeLaSaison, saisonDe, type EngagementCompte, type PartDeCachet } from "./indicateurs";

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

describe("revenusDeLaSaison", () => {
  // 1 € = 0,95 CHF : 950 CHF valent 1 000 €.
  const taux = { date: "2026-10-16", rates: { CHF: 0.95, USD: 1.1, GBP: 0.85, JPY: 160 } };

  function part(modif: Partial<PartDeCachet> = {}): PartDeCachet {
    return { ...engagement(), musicienId: "anna", nombreMusiciens: 1, cachet: 150000, devise: "EUR", ...modif };
  }

  it("aucun cachet : total vide, aucun musicien", () => {
    expect(revenusDeLaSaison([], saison, taux)).toEqual({ total: [], parMusicien: {}, converti: false });
  });

  it("un duo : le cachet est partagé, le total compte le cachet une fois", () => {
    const r = revenusDeLaSaison(
      [part({ nombreMusiciens: 2 }), part({ musicienId: "louis", nombreMusiciens: 2 })],
      saison,
      taux,
    );
    expect(r.total).toEqual([{ devise: "EUR", unites: 150000 }]);
    expect(r.parMusicien.anna).toEqual([{ devise: "EUR", unites: 75000 }]);
    expect(r.parMusicien.louis).toEqual([{ devise: "EUR", unites: 75000 }]);
  });

  it("seuls les engagements tenus comptent ; bénévole compté à 0 ; « à définir » ignoré", () => {
    const r = revenusDeLaSaison(
      [
        part({ statut: "demande" }),
        part({ statut: "option" }),
        part({ statut: "contrat_envoye" }),
        part({ statut: "annule" }),
        part({ statut: "joue", cachet: null }),
        part({ musicienId: "louis", statut: "paye", cachet: 0 }),
        part({ statut: "facture", cachet: 100000 }),
      ],
      saison,
      taux,
    );
    expect(r.total).toEqual([{ devise: "EUR", unites: 100000 }]);
    expect(r.parMusicien.louis).toEqual([{ devise: "EUR", unites: 0 }]);
  });

  it("un concert d'une autre saison n'est pas compté", () => {
    const r = revenusDeLaSaison([part({ debut: new Date("2026-06-15T19:00:00Z") })], saison, taux);
    expect(r.total).toEqual([]);
  });

  it("avec les taux : les francs suisses sont convertis en euros", () => {
    const r = revenusDeLaSaison([part({ cachet: 95000, devise: "CHF" }), part()], saison, taux);
    expect(r.total).toEqual([{ devise: "EUR", unites: 250000 }]);
    expect(r.converti).toBe(true);
  });

  it("sans taux : un montant par devise, jamais additionnés", () => {
    const r = revenusDeLaSaison([part({ cachet: 95000, devise: "CHF" }), part()], saison, null);
    expect(r.parMusicien.anna).toEqual([
      { devise: "EUR", unites: 150000 },
      { devise: "CHF", unites: 95000 },
    ]);
    expect(r.converti).toBe(false);
  });
});
