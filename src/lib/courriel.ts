import { Resend } from "resend";

// Sans nom de domaine vérifié, Resend impose cette adresse d'expédition
// et n'accepte d'écrire qu'à l'adresse du propriétaire du compte.
const EXPEDITEUR = "CM Management <onboarding@resend.dev>";

// Renvoie vrai si le courriel est parti. Un échec n'interrompt jamais l'action en cours.
export async function envoyerCourriel({ a, sujet, texte }: { a: string; sujet: string; texte: string }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`Courriel non envoyé (RESEND_API_KEY absente) : ${sujet} → ${a}`);
    return false;
  }
  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: EXPEDITEUR,
    to: a,
    subject: sujet,
    text: texte,
  });
  if (error) {
    console.warn(`Courriel non envoyé : ${sujet} → ${a} (${error.message})`);
    return false;
  }
  console.log(`Courriel envoyé : ${sujet} → ${a}`);
  return true;
}
