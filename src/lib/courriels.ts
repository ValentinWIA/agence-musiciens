import { z } from "zod";
import { TAILLE_MAX_TEXTE } from "@/lib/courrier";

// Import d'un dossier de courriels (.eml) sur /courriers (docs/import-courriels.md). Le navigateur lit les fichiers
// avec postal-mime ; le serveur enregistre les champs tels quels, sans IA. Logique pure, testée.

export const COURRIELS_PAR_ENVOI = 20; // une action serveur reçoit 1 Mo au plus : 20 × 10 000 caractères y tiennent
export const OBJET_MAX = 300;

// Ce que postal-mime rend d'un .eml (champs utilisés seulement).
export type EmlLu = {
  from?: { name?: string; address?: string };
  subject?: string;
  date?: string;
  messageId?: string;
  text?: string;
  html?: string;
};

export type CourrielImporte = { messageId: string | null; expediteur: string; objet: string; date: string | null; texte: string };

// Les entités nommées courantes en français (les autres restent telles quelles ; &amp; en dernier, sans boucle).
const ENTITES: Record<string, string> = {
  nbsp: " ", lt: "<", gt: ">", quot: '"', apos: "'", amp: "&", euro: "€", laquo: "«", raquo: "»", rsquo: "’", hellip: "…",
  agrave: "à", acirc: "â", eacute: "é", egrave: "è", ecirc: "ê", euml: "ë", icirc: "î", iuml: "ï", ocirc: "ô",
  ugrave: "ù", ucirc: "û", uuml: "ü", ccedil: "ç", oelig: "œ", Eacute: "É", Agrave: "À", Ccedil: "Ç",
};

// Un courriel en HTML seulement : le texte sans balises, paragraphes et sauts de ligne gardés.
export function htmlEnTexte(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (tout, nom: string) => ENTITES[nom] ?? tout)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// null : courriel sans texte (rien à lire), compté comme illisible.
export function extraireCourriel(eml: EmlLu): CourrielImporte | null {
  const texte = (eml.text?.trim() || (eml.html ? htmlEnTexte(eml.html) : "")).slice(0, TAILLE_MAX_TEXTE);
  if (!texte) return null;
  const { name, address } = eml.from ?? {};
  const expediteur = name && address ? `${name} <${address}>` : (address ?? name ?? "expéditeur inconnu");
  const date = eml.date && !Number.isNaN(Date.parse(eml.date)) ? new Date(eml.date).toISOString() : null;
  return {
    messageId: eml.messageId?.trim() || null,
    expediteur: expediteur.slice(0, OBJET_MAX),
    objet: (eml.subject?.trim() || "(sans objet)").slice(0, OBJET_MAX),
    date,
    texte,
  };
}

// Ce que le serveur accepte : le navigateur peut envoyer n'importe quoi.
export const schemaCourriel = z.object({
  messageId: z.string().trim().min(1).max(OBJET_MAX).nullable(),
  expediteur: z.string().trim().min(1).max(OBJET_MAX),
  objet: z.string().trim().min(1).max(OBJET_MAX),
  date: z.iso.datetime().nullable(),
  texte: z.string().trim().min(1).max(TAILLE_MAX_TEXTE),
});
export const schemaEnvoi = z.array(schemaCourriel).min(1).max(COURRIELS_PAR_ENVOI);

// L'identifiant qui empêche les doublons : le Message-ID, sinon une empreinte du courriel (même contenu, même empreinte).
export async function identifiantCourriel(c: CourrielImporte): Promise<string> {
  if (c.messageId) return c.messageId;
  const octets = new TextEncoder().encode([c.expediteur, c.date ?? "", c.objet, c.texte].join("\n"));
  const empreinte = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", octets)), (o) => o.toString(16).padStart(2, "0")).join("");
  return `empreinte:${empreinte}`;
}
