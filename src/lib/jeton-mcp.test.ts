import { describe, expect, it } from "vitest";
import { jetonValide } from "./jeton-mcp";

const SECRET = "x".repeat(40);

describe("jetonValide", () => {
  it("accepte le bon jeton, présenté comme « Bearer <jeton> »", () => {
    expect(jetonValide(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it("refuse une requête sans jeton, avec un faux jeton, ou le jeton sans « Bearer »", () => {
    expect(jetonValide(null, SECRET)).toBe(false);
    expect(jetonValide(`Bearer ${"y".repeat(40)}`, SECRET)).toBe(false);
    expect(jetonValide(SECRET, SECRET)).toBe(false);
  });

  it("refuse tout si MCP_JETON n'est pas défini ou trop court (un jeton qui se devine n'en est pas un)", () => {
    expect(jetonValide("Bearer ", undefined)).toBe(false);
    expect(jetonValide("Bearer ", "")).toBe(false);
    expect(jetonValide("Bearer court", "court")).toBe(false);
  });
});
