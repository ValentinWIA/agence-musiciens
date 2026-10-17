import { describe, expect, it } from "vitest";
import { lireProgrammateur, presenterProgrammateur, trouverDoublonProgrammateur } from "./programmateurs";

const valide = { nom: " Hélène Faure ", structure: " Festival de Sully ", email: " h.faure@festival-sully.test " };

describe("lireProgrammateur", () => {
  it("accepte un programmateur complet et retire les espaces autour", () => {
    expect(lireProgrammateur(valide).programmateur).toEqual({
      nom: "Hélène Faure",
      structure: "Festival de Sully",
      email: "h.faure@festival-sully.test",
    });
  });

  it("refuse un nom ou un e-mail vide (ou fait d'espaces)", () => {
    const { erreurs } = lireProgrammateur({ nom: "  ", structure: "", email: "" });
    expect(erreurs?.nom).toEqual(["Nom obligatoire."]);
    expect(erreurs?.email).toBeDefined();
    expect(erreurs?.structure).toBeUndefined();
  });

  it("accepte une structure vide, faite d'espaces ou absente, gardée comme « rien »", () => {
    expect(lireProgrammateur({ ...valide, structure: "   " }).programmateur?.structure).toBeNull();
    expect(lireProgrammateur({ nom: "Hélène Faure", email: "h@sully.test" }).programmateur?.structure).toBeNull();
  });

  it("refuse un e-mail mal formé", () => {
    expect(lireProgrammateur({ ...valide, email: "h.faure" }).erreurs?.email).toBeDefined();
    expect(lireProgrammateur({ ...valide, email: "h faure@sully.test" }).erreurs?.email).toBeDefined();
  });

  it("refuse un champ obligatoire absent (formulaire trafiqué)", () => {
    expect(lireProgrammateur({ nom: "Hélène Faure" }).erreurs?.email).toBeDefined();
  });
});

describe("presenterProgrammateur", () => {
  it("montre la structure après le nom, ou le nom seul", () => {
    expect(presenterProgrammateur({ nom: "Sophie Garnier", structure: "Saison des salles parisiennes" })).toBe(
      "Sophie Garnier — Saison des salles parisiennes",
    );
    expect(presenterProgrammateur({ nom: "Hélène Faure", structure: null })).toBe("Hélène Faure");
  });
});

describe("trouverDoublonProgrammateur", () => {
  const existants = [
    { nom: "Hélène Faure", structure: "Festival de Sully", email: "h.faure@festival-sully.test" },
    { nom: "Marc Lenoir", structure: "Opéra de Tours", email: "m.lenoir@opera-tours.test" },
  ];

  it("trouve le même e-mail, casse et espaces mis à part", () => {
    expect(trouverDoublonProgrammateur(" H.Faure@Festival-Sully.test ", existants)?.nom).toBe("Hélène Faure");
  });

  it("laisse passer un homonyme avec un autre e-mail", () => {
    expect(trouverDoublonProgrammateur("helene.faure@autre-salle.test", existants)).toBeUndefined();
  });
});
