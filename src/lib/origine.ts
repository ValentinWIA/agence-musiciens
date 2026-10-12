// Adresse du site, pour fabriquer les liens envoyés par courriel (invitation, réinitialisation).
// Elle vient de Vercel, jamais de la demande du visiteur : l'en-tête Host se falsifie, et un lien
// pointant vers un autre site lui livrerait le jeton.
export function origineDuSite() {
  if (process.env.VERCEL_ENV === "production") return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_ENV === "preview") return `https://${process.env.VERCEL_BRANCH_URL}`;
  return "http://localhost:3000";
}
