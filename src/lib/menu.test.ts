import { describe, expect, it } from "vitest";
import { estActif, liensDuMenu } from "./menu";

const agent = { id: "a1", role: "admin" as const };
const louis = { id: "m1", role: "musicien" as const };

describe("liens du menu selon le rôle", () => {
  it("donne à l'agent ses 8 pages, dans l'ordre (journal des imports depuis les demandes, invitations depuis les musiciens)", () => {
    expect(liensDuMenu(agent).map((l) => l.libelle)).toEqual([
      "Tableau de bord",
      "Engagements",
      "Demandes reçues",
      "Musiciens",
      "Courriers",
      "Documents",
      "Assistant",
      "À valider",
    ]);
  });

  it("ne met pas le calendrier dans le menu de l'agent (le mois est sur son tableau de bord)", () => {
    expect(liensDuMenu(agent).map((l) => l.href)).not.toContain("/calendrier");
  });

  it("donne au musicien sa fiche (avec son identifiant), ses engagements et le calendrier", () => {
    expect(liensDuMenu(louis)).toEqual([
      { href: "/musiciens/m1", libelle: "Ma fiche" },
      { href: "/engagements", libelle: "Mes engagements" },
      { href: "/calendrier", libelle: "Calendrier" },
    ]);
  });

  it("ne montre au musicien ni les invitations, ni la liste des musiciens, ni le tableau de bord, ni les demandes reçues, ni les courriers, ni l'assistant", () => {
    const adresses = liensDuMenu(louis).map((l) => l.href);
    expect(adresses).not.toContain("/invitations");
    expect(adresses).not.toContain("/musiciens");
    expect(adresses).not.toContain("/questions");
    expect(adresses).not.toContain("/tableau-de-bord");
    expect(adresses).not.toContain("/demandes");
    expect(adresses).not.toContain("/courriers");
    expect(adresses).not.toContain("/assistant");
    expect(adresses).not.toContain("/validations");
  });
});

describe("liste dépliable des musiciens", () => {
  const musiciens = [
    { id: "m1", nom: "Louis Martin" },
    { id: "m2", nom: "Anna Petit" },
  ];

  it("donne à l'agent une fiche par musicien sous « Musiciens », dans l'ordre reçu", () => {
    const lien = liensDuMenu(agent, musiciens).find((l) => l.href === "/musiciens");
    expect(lien?.sousLiens).toEqual([
      { href: "/musiciens/m1", libelle: "Louis Martin" },
      { href: "/musiciens/m2", libelle: "Anna Petit" },
    ]);
  });

  it("aucun musicien → pas de liste dépliable", () => {
    expect(liensDuMenu(agent).find((l) => l.href === "/musiciens")?.sousLiens).toBeUndefined();
  });

  it("ne donne jamais la liste au musicien, même si on la lui passe", () => {
    expect(liensDuMenu(louis, musiciens).some((l) => l.sousLiens)).toBe(false);
  });
});

describe("lien actif selon l'adresse de la page", () => {
  it("allume le lien sur sa propre page", () => {
    expect(estActif("/engagements", "/engagements")).toBe(true);
  });

  it("allume « Engagements » sur une fiche ou un formulaire d'engagement (sous-pages)", () => {
    expect(estActif("/engagements/123", "/engagements")).toBe(true);
    expect(estActif("/engagements/123/modifier", "/engagements")).toBe(true);
    expect(estActif("/engagements/nouveau", "/engagements")).toBe(true);
  });

  it("allume « Ma fiche » quand le musicien modifie sa fiche", () => {
    expect(estActif("/musiciens/m1/modifier", "/musiciens/m1")).toBe(true);
  });

  it("n'allume pas un lien dont l'adresse commence seulement pareil (cas piégé)", () => {
    expect(estActif("/musiciens-x", "/musiciens")).toBe(false);
    expect(estActif("/musiciens/m10", "/musiciens/m1")).toBe(false);
  });

  it("n'allume pas un lien sur une autre page", () => {
    expect(estActif("/tableau-de-bord", "/engagements")).toBe(false);
  });
});
