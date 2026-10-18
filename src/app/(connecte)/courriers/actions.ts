"use server";

import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { refresh } from "next/cache";
import { extractText } from "unpdf";
import { z } from "zod";
import { db } from "@/db";
import { courriers } from "@/db/schema";
import {
  CONSIGNE,
  schemaLecture,
  schemaSaisie,
  TAILLE_MAX_FICHIER,
  TAILLE_MAX_TEXTE,
  verifierLecture,
  type LectureVerifiee,
} from "@/lib/courrier";
import { appelerModele, texteDe } from "@/lib/ia";
import { verifierAdmin } from "@/lib/session";

const MODELES_COURRIER = ["claude-haiku-5-5", "claude-sonnet-5-5"] as const;

export type EtatLecture = { erreur?: string; lecture?: LectureVerifiee; texte?: string; modele?: string; lectures?: number };

// Lit le courrier déposé : rien n'est enregistré ici, l'agent relit d'abord.
export async function lireCourrier(etat: EtatLecture, formData: FormData): Promise<EtatLecture> {
  const agent = await verifierAdmin("/courriers (lecture)");
  const texte = await texteDepose(formData);
  if ("erreur" in texte) return { erreur: texte.erreur };
  // Haiku suffit pour les 10 courriers du flux (décision 1, mesurée le 18/10) ; Sonnet pour un courrier complexe.
  const modele = z.enum(MODELES_COURRIER).catch("claude-haiku-5-5").parse(formData.get("modele"));

  console.log(`Lecture d'un courrier demandée par ${agent.nom} (${texte.texte.length} caractères, ${modele})`);
  const resultat = await appelerModele(
    "courrier",
    agent.id,
    {
      max_tokens: 4096,
      output_config: { effort: "low", format: zodOutputFormat(schemaLecture) },
      system: CONSIGNE,
      messages: [{ role: "user", content: `<courrier>\n${texte.texte}\n</courrier>` }],
    },
    modele,
  );
  refresh(); // la page des coûts compte l'appel
  if (!resultat.ok) return { erreur: `Lecture impossible : ${resultat.erreur}.` };

  // Le produit refuse ce qui n'entre pas dans le format, même si l'API l'a promis.
  let lecture;
  try {
    lecture = schemaLecture.safeParse(JSON.parse(texteDe(resultat.reponse)));
  } catch {
    lecture = null;
  }
  if (resultat.reponse.stop_reason !== "end_turn" || !lecture?.success) {
    console.warn(`Lecture refusée : réponse hors format (${resultat.reponse.stop_reason})`);
    return { erreur: "Réponse de l'IA illisible : rien n'est enregistré. Réessayez." };
  }
  return { lecture: verifierLecture(texte.texte, lecture.data), texte: texte.texte, modele, lectures: (etat.lectures ?? 0) + 1 };
}

async function texteDepose(formData: FormData): Promise<{ texte: string } | { erreur: string }> {
  const fichier = formData.get("fichier");
  let texte = String(formData.get("texte") ?? "");
  if (fichier instanceof File && fichier.size > 0) {
    if (fichier.size > TAILLE_MAX_FICHIER) return { erreur: "Fichier trop lourd (2 Mo au plus)." };
    const nom = fichier.name.toLowerCase();
    if (nom.endsWith(".pdf")) {
      try {
        texte = (await extractText(new Uint8Array(await fichier.arrayBuffer()), { mergePages: true })).text;
      } catch {
        return { erreur: "Ce PDF ne se lit pas." };
      }
    } else if (nom.endsWith(".txt")) {
      texte = await fichier.text();
    } else {
      return { erreur: "Fichier .txt ou .pdf seulement." };
    }
  }
  texte = texte.trim();
  if (!texte) return { erreur: "Collez le texte du courrier ou choisissez un fichier (un PDF scanné, sans texte, ne se lit pas)." };
  if (texte.length > TAILLE_MAX_TEXTE) return { erreur: `Courrier trop long (${TAILLE_MAX_TEXTE.toLocaleString("fr-FR")} caractères au plus).` };
  return { texte };
}

export type EtatValidation = { erreur?: string; reussi?: boolean };

// Enregistre le courrier tel que l'agent l'a relu et corrigé.
export async function validerCourrier(_etat: EtatValidation, formData: FormData): Promise<EtatValidation> {
  const agent = await verifierAdmin("/courriers (validation)");
  const saisie = schemaSaisie.safeParse(Object.fromEntries(formData));
  if (!saisie.success) return { erreur: saisie.error.issues.map((i) => i.message).join(" ") };

  const { date, ...champs } = saisie.data;
  await db.insert(courriers).values({ ...champs, dateCourrier: date, creePar: agent.id });
  console.log(`Courrier enregistré par ${agent.nom} (${champs.structure ?? "expéditeur inconnu"}, ${champs.classement})`);
  refresh();
  return { reussi: true };
}
