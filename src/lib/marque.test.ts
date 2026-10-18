import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Renommage du 17/10 : l'agence s'appelle « CM Management » (les initiales de Claire Morel). Ce test échoue si
// l'ancien nom revient dans l'application, ou si le nom technique « Agence-musiciens » s'affiche à l'utilisateur.
const ANCIENS_NOMS = ["AM Management", "Agence-musiciens"];
const racine = path.join(__dirname, "..");

const fichiers = readdirSync(racine, { recursive: true, encoding: "utf8" })
  .filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith("marque.test.ts"))
  .map((f) => ({ f, texte: readFileSync(path.join(racine, f), "utf8") }));

describe("marque : le nom affiché de l'agence", () => {
  it("aucun fichier de src/ ne contient l'ancien nom", () => {
    const restes = fichiers.flatMap(({ f, texte }) => ANCIENS_NOMS.filter((n) => texte.includes(n)).map((n) => `${f} : ${n}`));
    expect(restes).toEqual([]);
  });

  // Logo « la maison » (18/10) : C et M séparés par un filet, dans le site et dans l'icône d'onglet.
  it("le logo affiche « CM Management » et l'emblème C | M", () => {
    const logo = readFileSync(path.join(racine, "components/logo.tsx"), "utf8");
    expect(logo).toContain("CM Management");
    expect(logo).toMatch(/>\s*C\s*<[\s\S]*<line[\s\S]*>\s*M\s*</);
    const icone = readFileSync(path.join(racine, "app/icon.svg"), "utf8");
    expect(icone).toMatch(/>C<[\s\S]*<line[\s\S]*>M</);
  });
});
