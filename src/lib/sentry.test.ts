import { describe, expect, it } from "vitest";
import { masquerJetons, optionsSentry } from "./sentry";

describe("Sentry ne reçoit jamais de jeton", () => {
  it("masque le jeton d'invitation et de réinitialisation, avec ou sans suite d'adresse", () => {
    expect(masquerJetons("https://site.fr/invitation/abc123DEF_-x")).toBe("https://site.fr/invitation/[jeton]");
    expect(masquerJetons("/reinitialisation/abc123?x=1")).toBe("/reinitialisation/[jeton]?x=1");
    expect(masquerJetons("/invitation/abc#haut")).toBe("/invitation/[jeton]#haut");
  });

  it("laisse les autres adresses intactes, dont la liste des invitations de l'agent", () => {
    expect(masquerJetons("/engagements/1b2c")).toBe("/engagements/1b2c");
    expect(masquerJetons("/invitations")).toBe("/invitations");
  });

  it("masque le jeton partout dans l'événement envoyé (adresse, fil d'Ariane), sans casser l'événement", () => {
    const { beforeSend } = optionsSentry();
    const evenement = {
      request: { url: "https://site.fr/invitation/secret1" },
      breadcrumbs: [{ data: { from: "/connexion", to: "/reinitialisation/secret2" } }],
    };
    const envoye = JSON.stringify(beforeSend(evenement));
    expect(envoye).not.toContain("secret1");
    expect(envoye).not.toContain("secret2");
    expect(beforeSend(evenement).breadcrumbs[0].data.from).toBe("/connexion");
  });

  it("ne collecte ni cookies, ni en-têtes, ni corps de requête, ni variables locales", () => {
    const { dataCollection } = optionsSentry();
    expect(dataCollection).toMatchObject({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      stackFrameVariables: false,
    });
  });
});
