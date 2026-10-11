import { z } from "zod";

// Règle unique pour tout mot de passe choisi dans le produit (installation, invitation, réinitialisation).
export const regleMotDePasse = z.string().min(12, { error: "Au moins 12 caractères." });
