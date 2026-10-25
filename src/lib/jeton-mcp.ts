import { createHash, timingSafeEqual } from "node:crypto";

// Le serveur MCP (docs/semaine-4.md, tranche A5) est ouvert à qui présente le jeton MCP_JETON dans l'en-tête
// « Authorization: Bearer <jeton> ». Sans jeton défini, ou trop court pour ne pas se deviner, tout est refusé.
export const LONGUEUR_MIN = 32;

export function jetonValide(enTete: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < LONGUEUR_MIN) return false;
  // Comparaison en temps constant (sur les empreintes, de même longueur) : le temps de réponse ne trahit pas le jeton.
  const empreinte = (texte: string) => createHash("sha256").update(texte).digest();
  return timingSafeEqual(empreinte(enTete ?? ""), empreinte(`Bearer ${secret}`));
}
