"use client";

import PostalMime from "postal-mime";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { COURRIELS_PAR_ENVOI, extraireCourriel, type CourrielImporte } from "@/lib/courriels";
import { importerCourriels } from "./actions";

// « Importer un dossier » (ordinateur seulement) : les .eml sont lus ici, dans le navigateur, puis envoyés au serveur
// par lots, sans IA. Les autres fichiers du dossier sont ignorés.
export function ImportDossier() {
  const champ = useRef<HTMLInputElement>(null);
  const [enCours, setEnCours] = useState(false);
  const [bilan, setBilan] = useState<{ texte: string; erreur: boolean } | null>(null);

  async function importer(fichiers: File[]) {
    const eml = fichiers.filter((f) => f.name.toLowerCase().endsWith(".eml"));
    if (eml.length === 0) return setBilan({ texte: "Aucun courriel (.eml) dans ce dossier.", erreur: true });
    setEnCours(true);
    setBilan(null);
    const lus: CourrielImporte[] = [];
    let illisibles = 0;
    for (const f of eml) {
      const c = await PostalMime.parse(await f.arrayBuffer()).then(extraireCourriel, () => null);
      if (c) lus.push(c);
      else illisibles++;
    }
    let importes = 0;
    let deja = 0;
    try {
      for (let i = 0; i < lus.length; i += COURRIELS_PAR_ENVOI) {
        const r = await importerCourriels(lus.slice(i, i + COURRIELS_PAR_ENVOI));
        if ("erreur" in r) return setBilan({ texte: r.erreur, erreur: true });
        importes += r.importes;
        deja += r.deja;
      }
      const parties = [`${importes} importé${importes > 1 ? "s" : ""}`, `${deja} déjà présent${deja > 1 ? "s" : ""}`];
      if (illisibles) parties.push(`${illisibles} fichier${illisibles > 1 ? "s" : ""} illisible${illisibles > 1 ? "s" : ""}`);
      setBilan({ texte: `${parties.join(", ")}.`, erreur: false });
    } catch {
      setBilan({ texte: "L'import a été interrompu : relancez-le, les courriels déjà importés seront ignorés.", erreur: true });
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="hidden flex-wrap items-center gap-3 md:flex">
      {/* webkitdirectory : le navigateur fait choisir un dossier et donne tous ses fichiers. */}
      <input
        ref={champ}
        type="file"
        className="hidden"
        {...{ webkitdirectory: "" }}
        onChange={(e) => {
          const fichiers = Array.from(e.target.files ?? []);
          e.target.value = ""; // le même dossier pourra être réimporté
          void importer(fichiers);
        }}
      />
      <Button type="button" variant="outline" onClick={() => champ.current?.click()} disabled={enCours}>
        {enCours ? "Import du dossier…" : "Importer un dossier"}
      </Button>
      {bilan && (
        <span role={bilan.erreur ? "alert" : "status"} className={`text-sm ${bilan.erreur ? "text-destructive" : "text-muted-foreground"}`}>
          {bilan.texte}
        </span>
      )}
    </div>
  );
}
