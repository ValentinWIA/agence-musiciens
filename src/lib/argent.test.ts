import { describe, expect, it } from "vitest";
import { formaterMontant, versUniteMinimale } from "./argent";

describe("conversion des montants saisis", () => {
  it("convertit des euros avec virgule ou point (cas normal)", () => {
    expect(versUniteMinimale("1250,10", "EUR")).toBe(125010);
    expect(versUniteMinimale("1 250.10", "EUR")).toBe(125010);
    expect(versUniteMinimale("2000", "CHF")).toBe(200000);
  });

  it("additionne sans erreur d'arrondi (1 250,10 + 3 200,20)", () => {
    const total = versUniteMinimale("1250,10", "EUR")! + versUniteMinimale("3200,20", "EUR")!;
    expect(total).toBe(445030);
  });

  it("traite le yen, qui n'a pas de centimes", () => {
    expect(versUniteMinimale("300000", "JPY")).toBe(300000);
    expect(versUniteMinimale("300000,50", "JPY")).toBeNull();
  });

  it("refuse une saisie vide, négative ou avec trop de décimales (cas vides et piégés)", () => {
    expect(versUniteMinimale("", "EUR")).toBeNull();
    expect(versUniteMinimale("-500", "EUR")).toBeNull();
    expect(versUniteMinimale("12,345", "EUR")).toBeNull();
    expect(versUniteMinimale("deux mille", "EUR")).toBeNull();
  });
});

describe("affichage des montants", () => {
  it("affiche à la française, avec la devise", () => {
    expect(formaterMontant(125010, "EUR").replace(/\s/g, " ")).toBe("1 250,10 €");
    expect(formaterMontant(300000, "JPY").replace(/\s/g, " ")).toBe("300 000 JPY");
  });
});
