import { describe, expect, it } from "vitest";
import { estActif, liensDuMenu } from "./menu";

const agent = { id: "a1", role: "admin" as const };
const louis = { id: "m1", role: "musicien" as const };

describe("liens du menu selon le rôle", () => {
  it("donne à l'agent ses 6 pages, dans l'ordre", () => {
    expect(liensDuMenu(agent).map((l) => l.libelle)).toEqual([
      "Tableau de bord",
      "Engagements",
      "Calendrier",
      "Musiciens",
      "Invitations",
      "Flux de nuit",
    ]);
  });

  it("donne au musicien sa fiche (avec son identifiant), ses engagements et le calendrier", () => {
    expect(liensDuMenu(louis)).toEqual([
      { href: "/musiciens/m1", libelle: "Ma fiche" },
      { href: "/engagements", libelle: "Mes engagements" },
      { href: "/calendrier", libelle: "Calendrier" },
    ]);
  });

  it("ne montre au musicien ni les invitations, ni la liste des musiciens, ni le tableau de bord, ni le flux de nuit", () => {
    const adresses = liensDuMenu(louis).map((l) => l.href);
    expect(adresses).not.toContain("/invitations");
    expect(adresses).not.toContain("/musiciens");
    expect(adresses).not.toContain("/tableau-de-bord");
    expect(adresses).not.toContain("/nuit");
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
