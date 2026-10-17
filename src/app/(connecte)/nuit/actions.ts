"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { jourLocal } from "@/lib/calendrier";
import { PREMIERE_NUIT } from "@/lib/flux";
import { envoyerRecap } from "@/lib/envoi-recap";
import { importerNuit, nuitAProposer, rattraper } from "@/lib/import-nuit";
import { verifierAdmin } from "@/lib/session";

export type EtatImport = { message?: string; reussi?: boolean; nuitProposee?: string };

export async function importerUneNuit(_etat: EtatImport, formData: FormData): Promise<EtatImport> {
  const agent = await verifierAdmin("/nuit (import)");

  const aujourdhui = jourLocal(new Date(), "France");
  const nuit = z.iso
    .date()
    .refine((jour) => jour >= PREMIERE_NUIT && jour <= aujourdhui)
    .safeParse(formData.get("nuit"));
  if (!nuit.success) return { message: `Choisissez une nuit entre le 20/09/2026 et aujourd'hui.` };

  console.log(`Import demandé par ${agent.nom} : nuit du ${nuit.data}`);
  const resultat = await importerNuit(nuit.data, "bouton");
  refresh();
  const nuitProposee = await nuitAProposer();
  const nuitDu = formaterJour(nuit.data);
  if (!resultat.ok) return { message: `Nuit du ${nuitDu} : ${resultat.erreur}`, nuitProposee };
  const c = resultat.compteurs;
  return {
    reussi: true,
    nuitProposee,
    message:
      `Nuit du ${nuitDu} importée : ${c.recus} reçus, ${c.traites} traités, ` +
      `${c.doublons} doublons, ${c.misDeCote} mis de côté.`,
  };
}

export type EtatRattrapage = { message?: string; reussi?: boolean };

export async function rattraperLesNuits(): Promise<EtatRattrapage> {
  const agent = await verifierAdmin("/nuit (rattrapage)");
  console.log(`Rattrapage demandé par ${agent.nom}`);
  const { importees, restantes, echec } = await rattraper("bouton");
  refresh();

  if (importees.length === 0 && !echec) {
    return { reussi: true, message: "Rien à importer : toutes les nuits depuis le 20/09 sont importées." };
  }
  const n = importees.length;
  const phrases = [];
  if (n > 0) {
    const periode = n === 1 ? `du ${formaterJour(importees[0])}` : `du ${formaterJour(importees[0])} au ${formaterJour(importees[n - 1])}`;
    phrases.push(`${n} nuit${n > 1 ? "s" : ""} importée${n > 1 ? "s" : ""} (${periode}).`);
  }
  if (echec) phrases.push(`Arrêté sur la nuit du ${formaterJour(echec.nuitDu)} : ${echec.erreur}`);
  if (restantes > 0) phrases.push(`Il en reste ${restantes} : relancez.`);
  return { reussi: !echec, message: phrases.join(" ") };
}

export type EtatRecap = { message?: string; reussi?: boolean };

export async function envoyerLeRecap(): Promise<EtatRecap> {
  const agent = await verifierAdmin("/nuit (récap)");
  console.log(`Récap demandé par ${agent.nom}`);
  const resultat = await envoyerRecap("bouton");
  refresh();
  if (resultat.etat === "envoye") return { reussi: true, message: `Récap envoyé à ${resultat.destinataire}.` };
  if (resultat.etat === "deja-envoye") return { reussi: true, message: "Déjà envoyé aujourd'hui : rien n'est renvoyé." };
  return { message: `Récap non envoyé : ${resultat.erreur}` };
}

function formaterJour(jour: string) {
  return new Date(`${jour}T12:00:00Z`).toLocaleDateString("fr-FR");
}
