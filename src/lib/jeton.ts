import { createHash, randomBytes } from "node:crypto";

// Jeton secret pour un lien (invitation, réinitialisation). Seule son empreinte est stockée en base :
// quelqu'un qui lirait la base ne pourrait pas reconstituer les liens.
export function nouveauJeton() {
  const jeton = randomBytes(32).toString("base64url");
  return { jeton, jetonHash: empreinte(jeton) };
}

export function empreinte(jeton: string) {
  return createHash("sha256").update(jeton).digest("hex");
}
