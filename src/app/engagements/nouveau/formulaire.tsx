"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { DEVISES } from "@/lib/argent";
import { creerEngagement, type EtatCreation } from "./actions";

type Props = {
  lieux: { id: string; nom: string; ville: string }[];
  programmateurs: { id: string; nom: string; structure: string }[];
  musiciens: { id: string; nom: string; instrument: string | null }[];
};

const PRECISIONS = { jour: "précise", mois: "mois", saison: "saison" } as const;
const classeZoneTexte =
  "min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function FormulaireEngagement({ lieux, programmateurs, musiciens }: Props) {
  const [etat, action, enCours] = useActionState<EtatCreation, FormData>(creerEngagement, {});
  const v = etat.valeurs ?? {};
  const valeur = (cle: string) => (typeof v[cle] === "string" ? (v[cle] as string) : "");
  const [precision, setPrecision] = useState(valeur("precision") || "jour");
  const err = etat.erreurs ?? {};

  return (
    <form action={action} className="grid gap-5">
      <Champ id="titre" titre="Titre court (facultatif)" erreurs={err.titre}>
        <Input id="titre" name="titre" defaultValue={valeur("titre")} maxLength={120} />
      </Champ>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Date</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          {Object.entries(PRECISIONS).map(([cle, libelle]) => (
            <label key={cle} className="flex items-center gap-1.5">
              <input
                type="radio"
                name="precision"
                value={cle}
                defaultChecked={(valeur("precision") || "jour") === cle}
                onChange={() => setPrecision(cle)}
              />
              {libelle}
            </label>
          ))}
        </div>
        {/* Les champs des autres précisions restent dans la page, vides : le serveur ne lit que ceux de la précision choisie. */}
        <div className={precision === "jour" ? "flex flex-wrap gap-2" : "hidden"}>
          <Input type="date" name="jour" defaultValue={valeur("jour")} aria-label="Jour" className="w-44" />
          <Input type="time" name="heure" defaultValue={valeur("heure")} aria-label="Heure (heure locale du lieu)" className="w-32" />
          <span className="self-center text-sm text-muted-foreground">heure locale du lieu</span>
        </div>
        <div className={precision === "mois" ? "" : "hidden"}>
          <Input type="month" name="mois" defaultValue={valeur("mois")} aria-label="Mois" className="w-44" />
        </div>
        <div className={precision === "saison" ? "flex gap-2" : "hidden"}>
          <NativeSelect name="saison" defaultValue={valeur("saison") || "printemps"} aria-label="Saison">
            <NativeSelectOption value="printemps">printemps</NativeSelectOption>
            <NativeSelectOption value="ete">été</NativeSelectOption>
            <NativeSelectOption value="automne">automne</NativeSelectOption>
            <NativeSelectOption value="hiver">hiver (décembre à février)</NativeSelectOption>
          </NativeSelect>
          <Input type="number" name="annee" defaultValue={valeur("annee")} placeholder="2027" aria-label="Année" className="w-24" />
        </div>
        <Erreurs liste={err.date ?? err.precision} />
      </fieldset>

      <Champ id="duree" titre="Durée prévue, en minutes (facultatif)" erreurs={err.duree}>
        <Input id="duree" name="duree" inputMode="numeric" defaultValue={valeur("duree")} className="w-28" />
      </Champ>

      <Champ id="lieuId" titre="Lieu" erreurs={err.lieuId}>
        <NativeSelect id="lieuId" name="lieuId" defaultValue={valeur("lieuId")} aria-invalid={!!err.lieuId}>
          <NativeSelectOption value="">Choisir…</NativeSelectOption>
          {lieux.map((l) => (
            <NativeSelectOption key={l.id} value={l.id}>
              {l.nom}, {l.ville}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Champ>

      <Champ id="programmateurId" titre="Programmateur" erreurs={err.programmateurId}>
        <NativeSelect
          id="programmateurId"
          name="programmateurId"
          defaultValue={valeur("programmateurId")}
          aria-invalid={!!err.programmateurId}
        >
          <NativeSelectOption value="">Choisir…</NativeSelectOption>
          {programmateurs.map((p) => (
            <NativeSelectOption key={p.id} value={p.id}>
              {p.nom} — {p.structure}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Champ>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Musiciens (un ou deux)</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          {musiciens.map((m) => (
            <label key={m.id} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                name="musiciens"
                value={m.id}
                defaultChecked={Array.isArray(v.musiciens) && v.musiciens.includes(m.id)}
              />
              {m.nom} ({m.instrument})
            </label>
          ))}
        </div>
        <Erreurs liste={err.musiciens} />
      </fieldset>

      <Champ id="cachet" titre="Cachet (facultatif ; 0 pour un concert bénévole)" erreurs={err.cachet ?? err.devise}>
        <div className="flex gap-2">
          <Input id="cachet" name="cachet" inputMode="decimal" defaultValue={valeur("cachet")} className="w-36" />
          <NativeSelect name="devise" defaultValue={valeur("devise") || "EUR"} aria-label="Devise">
            {DEVISES.map((d) => (
              <NativeSelectOption key={d} value={d}>
                {d}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </Champ>

      <Champ id="programme" titre="Programme (facultatif)" erreurs={err.programme}>
        <textarea id="programme" name="programme" defaultValue={valeur("programme")} className={classeZoneTexte} />
      </Champ>

      <Champ id="notes" titre="Notes (facultatif)" erreurs={err.notes}>
        <textarea id="notes" name="notes" defaultValue={valeur("notes")} className={classeZoneTexte} />
      </Champ>

      {etat.erreurs && (
        <p role="alert" className="text-sm text-destructive">
          L&apos;engagement n&apos;a pas été créé : corrigez les champs signalés.
        </p>
      )}
      <div className="flex justify-end gap-3">
        <Link href="/engagements" className="self-center text-sm underline">
          Annuler
        </Link>
        <Button type="submit" disabled={enCours}>
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}

function Champ({ id, titre, erreurs, children }: { id: string; titre: string; erreurs?: string[]; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{titre}</Label>
      {children}
      <Erreurs liste={erreurs} />
    </div>
  );
}

function Erreurs({ liste }: { liste?: string[] }) {
  return liste?.map((e) => (
    <p key={e} className="text-sm text-destructive">
      {e}
    </p>
  ));
}
