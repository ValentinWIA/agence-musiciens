import { describe, expect, it } from "vitest";
import { dateDemandePassee, estATraiter, preRemplissage, trierDemandes } from "./demandes";

const demande = { reference: "RES-20261017-05", statut: "demandee" as const, dateConcert: "2026-11-15", engagementId: null };

describe("demande à traiter", () => {
  it("garde une demande sans engagement, demandée ou confirmée", () => {
    expect(estATraiter(demande)).toBe(true);
    expect(estATraiter({ ...demande, statut: "confirmee" })).toBe(true);
  });

  it("sort une demande devenue engagement", () => {
    expect(estATraiter({ ...demande, engagementId: "e1" })).toBe(false);
  });

  it("sort une demande annulée ou terminée par le programmateur", () => {
    expect(estATraiter({ ...demande, statut: "annulee" })).toBe(false);
    expect(estATraiter({ ...demande, statut: "terminee" })).toBe(false);
  });
});

describe("ordre des demandes", () => {
  it("met le concert le plus proche en tête, puis range par référence à date égale", () => {
    const liste = [
      { ...demande, reference: "B", dateConcert: "2026-12-01" },
      { ...demande, reference: "C", dateConcert: "2026-11-02" },
      { ...demande, reference: "A", dateConcert: "2026-12-01" },
    ];
    expect(trierDemandes(liste).map((d) => d.reference)).toEqual(["C", "A", "B"]);
  });
});

describe("date passée", () => {
  it("n'est passée qu'à partir du lendemain du concert", () => {
    expect(dateDemandePassee("2026-10-16", "2026-10-17")).toBe(true);
    expect(dateDemandePassee("2026-10-17", "2026-10-17")).toBe(false);
  });
});

describe("pré-remplissage du formulaire d'engagement", () => {
  const programmateurs = [
    { id: "p1", nom: "Camille Girard" },
    { id: "p2", nom: "Louise Moreau" },
  ];

  it("reprend la date (sans heure) et la durée de la demande", () => {
    const valeurs = preRemplissage({ dateConcert: "2026-11-15", dureeMinutes: 120, programmateur: "Inconnu" }, programmateurs);
    expect(valeurs).toEqual({ precision: "jour", jour: "2026-11-15", heure: "", duree: "120", programmateurId: "" });
  });

  it("choisit le programmateur de même nom, casse et espaces mis à part", () => {
    expect(preRemplissage({ dateConcert: "2026-11-15", dureeMinutes: 60, programmateur: " camille  GIRARD " }, programmateurs).programmateurId).toBe("p1");
  });

  it("ne choisit personne si deux programmateurs portent ce nom (cas piégé)", () => {
    const homonymes = [...programmateurs, { id: "p3", nom: "Camille Girard" }];
    expect(preRemplissage({ dateConcert: "2026-11-15", dureeMinutes: 60, programmateur: "Camille Girard" }, homonymes).programmateurId).toBe("");
  });
});
