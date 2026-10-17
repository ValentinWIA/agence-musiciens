import { Resend } from "resend";

// Sous-domaine vérifié dans Resend : l'adresse principale (contact@valentinwalczak.com) n'est pas touchée.
const EXPEDITEUR = "CM Management <ne-pas-repondre@mail.valentinwalczak.com>";

// Le domaine .test est réservé et n'existe jamais (adresses du jeu de données) : un envoi rebondirait
// et abîmerait la réputation du domaine d'envoi.
export function estAdresseFictive(adresse: string) {
  return /\.test$/i.test(adresse.trim());
}

// Renvoie vrai si le courriel est parti. Un échec n'interrompt jamais l'action en cours.
export async function envoyerCourriel({ a, sujet, texte }: { a: string; sujet: string; texte: string }) {
  if (estAdresseFictive(a)) {
    console.log(`Courriel non envoyé (adresse fictive) : ${sujet} → ${a}`);
    return false;
  }
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
