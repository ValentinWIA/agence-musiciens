"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { jourLocal } from "@/lib/calendrier";
import { PREMIERE_NUIT } from "@/lib/flux";
import { importerNuit, nuitAProposer } from "@/lib/import-nuit";
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
  const nuitDu = new Date(`${nuit.data}T12:00:00Z`).toLocaleDateString("fr-FR");
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
