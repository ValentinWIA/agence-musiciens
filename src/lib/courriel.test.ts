import { describe, expect, it } from "vitest";
import { envoyerCourriel, estAdresseFictive } from "./courriel";

describe("adresses fictives", () => {
  it("reconnaît les adresses du jeu de données (.test), majuscules et espaces compris", () => {
    expect(estAdresseFictive("lea.martin@agence-musiciens.test")).toBe(true);
    expect(estAdresseFictive(" Agent@Agence-Musiciens.TEST ")).toBe(true);
  });

  it("laisse passer les vraies adresses, même si « test » apparaît ailleurs", () => {
    expect(estAdresseFictive("prenom@gmail.com")).toBe(false);
    expect(estAdresseFictive("test@mail.valentinwalczak.com")).toBe(false);
    expect(estAdresseFictive("a@test.fr")).toBe(false);
  });

  it("n'appelle pas Resend pour une adresse fictive, même avec une clé", async () => {
    process.env.RESEND_API_KEY = "cle-factice";
    expect(await envoyerCourriel({ a: "x@agence-musiciens.test", sujet: "Essai", texte: "…" })).toBe(false);
    delete process.env.RESEND_API_KEY;
  });
});
