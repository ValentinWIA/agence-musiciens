"use client";

import Link from "next/link";
import { startTransition, useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { DEVISES } from "@/lib/argent";
import type { ChampsDate } from "@/lib/dates";
import { programmateursDeMemeNom } from "@/lib/demandes";
import { NouveauLieu, type LieuCree } from "./nouveau-lieu";
import { NouveauProgrammateur, type ProgrammateurCree } from "./nouveau-programmateur";
import type { EtatFormulaire } from "./saisie";

export type Valeurs = ChampsDate & {
  titre: string;
  precision: "jour" | "mois" | "saison";
  duree: string;
  lieuId: string;
  programmateurId: string;
  musiciens: string[];
  cachet: string;
  devise: string;
  programme: string;
  notes: string;
};

type Props = {
  action: (etat: EtatFormulaire, formData: FormData) => Promise<EtatFormulaire>;
  lieux: { id: string; nom: string; ville: string }[];
  programmateurs: { id: string; nom: string; structure: string }[];
  musiciens: { id: string; nom: string; instrument: string | null }[];
  // En modification : l'engagement, ses valeurs actuelles et, s'il est verrouillé, la raison affichée.
  // À la création, seulement les champs déjà connus (venus d'un musicien ou d'une demande) ; le reste est vide.
  id?: string;
  valeurs?: Partial<Valeurs>;
  verrouille?: string;
  // Venu d'une demande reçue : son identifiant voyage avec le formulaire, son lieu (texte libre du flux) est rappelé,
  // le nom du demandeur sert à la phrase d'aide et pré-remplit « + nouveau programmateur ».
  demande?: { id: string; lieu: string; programmateur: string };
};

const VIDE: Valeurs = {
  titre: "",
  precision: "jour",
  jour: "",
  heure: "",
  mois: "",
  saison: "printemps",
  annee: "",
  duree: "",
  lieuId: "",
  programmateurId: "",
  musiciens: [],
  cachet: "",
  devise: "EUR",
  programme: "",
  notes: "",
};

const PRECISIONS = { jour: "précise", mois: "mois", saison: "saison" } as const;
const classeZoneTexte =
  "min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function FormulaireEngagement({ action: envoyer, lieux, programmateurs, musiciens, id, valeurs: connues, verrouille, demande }: Props) {
  // Complété ici, côté navigateur : un serveur ne peut pas lire une constante d'un fichier « use client ».
  const valeurs = { ...VIDE, ...connues };
  const [etat, action, enCours] = useActionState<EtatFormulaire, FormData>(envoyer, {});
  const [precision, setPrecision] = useState(valeurs.precision);
  const err = etat.erreurs ?? {};
  // Un champ désactivé n'est pas envoyé ; le serveur, lui, ignore ces champs quoi qu'il reçoive.
  const fige = !!verrouille;
  // La liste des lieux grandit quand l'agent en crée un ; le lieu créé est aussitôt sélectionné.
  const [listeLieux, setListeLieux] = useState(lieux);
  const [lieuId, setLieuId] = useState(valeurs.lieuId);
  const fenetreLieu = useRef<HTMLDialogElement>(null);
  const ajouterLieu = (lieu: LieuCree) => {
    setListeLieux((l) => [...l, lieu].sort((a, b) => a.ville.localeCompare(b.ville, "fr") || a.nom.localeCompare(b.nom, "fr")));
    setLieuId(lieu.id);
  };
  // Même principe pour les programmateurs.
  const [listeProgrammateurs, setListeProgrammateurs] = useState(programmateurs);
  const [programmateurId, setProgrammateurId] = useState(valeurs.programmateurId);
  const fenetreProgrammateur = useRef<HTMLDialogElement>(null);
  const ajouterProgrammateur = (programmateur: ProgrammateurCree) => {
    setListeProgrammateurs((l) => [...l, programmateur].sort((a, b) => a.nom.localeCompare(b.nom, "fr")));
    setProgrammateurId(programmateur.id);
  };
  const homonymes = demande ? programmateursDeMemeNom(demande.programmateur, listeProgrammateurs).length : 0;

  return (
    <>
      <form
        // Envoi sans la remise à zéro automatique de React : elle viderait les listes déroulantes après un refus.
        onSubmit={(e) => {
          e.preventDefault();
          const donnees = new FormData(e.currentTarget);
          startTransition(() => action(donnees));
        }}
        className="grid gap-5"
      >
        {id && <input type="hidden" name="id" value={id} />}
        {demande && <input type="hidden" name="demandeId" value={demande.id} />}
        {verrouille && (
          <p role="note" className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
            {verrouille}
          </p>
        )}

        <Champ id="titre" titre="Titre court (facultatif)" erreurs={err.titre}>
          <Input id="titre" name="titre" maxLength={120} defaultValue={valeurs.titre} />
        </Champ>

        <fieldset className="grid gap-2" disabled={fige}>
          <legend className="mb-2 text-sm font-medium">Date</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            {Object.entries(PRECISIONS).map(([cle, libelle]) => (
              <label key={cle} className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="precision"
                  value={cle}
                  defaultChecked={cle === valeurs.precision}
                  onChange={() => setPrecision(cle as Valeurs["precision"])}
                />
                {libelle}
              </label>
            ))}
          </div>
          {/* Les champs des autres précisions restent dans la page : le serveur ne lit que ceux de la précision choisie. */}
          <div className={precision === "jour" ? "flex flex-wrap gap-2" : "hidden"}>
            <Input type="date" name="jour" aria-label="Jour" className="w-44" defaultValue={valeurs.jour} />
            <Input type="time" name="heure" aria-label="Heure (heure locale du lieu)" className="w-32" defaultValue={valeurs.heure} />
            <span className="self-center text-sm text-muted-foreground">heure locale du lieu</span>
          </div>
          <div className={precision === "mois" ? "" : "hidden"}>
            <Input type="month" name="mois" aria-label="Mois" className="w-44" defaultValue={valeurs.mois} />
          </div>
          <div className={precision === "saison" ? "flex gap-2" : "hidden"}>
            <NativeSelect name="saison" defaultValue={valeurs.saison} aria-label="Saison">
              <NativeSelectOption value="printemps">printemps</NativeSelectOption>
              <NativeSelectOption value="ete">été</NativeSelectOption>
              <NativeSelectOption value="automne">automne</NativeSelectOption>
              <NativeSelectOption value="hiver">hiver (décembre à février)</NativeSelectOption>
            </NativeSelect>
            <Input type="number" name="annee" placeholder="2027" aria-label="Année" className="w-24" defaultValue={valeurs.annee} />
          </div>
          <Erreurs liste={err.date ?? err.precision} />
        </fieldset>

        <Champ id="duree" titre="Durée prévue, en minutes (facultatif)" erreurs={err.duree}>
          <Input id="duree" name="duree" inputMode="numeric" className="w-28" defaultValue={valeurs.duree} disabled={fige} />
        </Champ>

        <Champ id="lieuId" titre="Lieu" erreurs={err.lieuId}>
          <NativeSelect
            id="lieuId"
            name="lieuId"
            aria-invalid={!!err.lieuId}
            value={lieuId}
            onChange={(e) => setLieuId(e.target.value)}
            disabled={fige}
          >
            <NativeSelectOption value="">Choisir…</NativeSelectOption>
            {listeLieux.map((l) => (
              <NativeSelectOption key={l.id} value={l.id}>
                {l.nom}, {l.ville}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {!fige && (
            <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => fenetreLieu.current?.showModal()}>
              + nouveau lieu
            </Button>
          )}
          {demande && <p className="text-sm text-muted-foreground">Lieu indiqué dans la demande : « {demande.lieu} »</p>}
        </Champ>

        <Champ id="programmateurId" titre="Programmateur" erreurs={err.programmateurId}>
          <NativeSelect
            id="programmateurId"
            name="programmateurId"
            aria-invalid={!!err.programmateurId}
            value={programmateurId}
            onChange={(e) => setProgrammateurId(e.target.value)}
            disabled={fige}
          >
            <NativeSelectOption value="">Choisir…</NativeSelectOption>
            {listeProgrammateurs.map((p) => (
              <NativeSelectOption key={p.id} value={p.id}>
                {p.nom} — {p.structure}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {!fige && (
            <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => fenetreProgrammateur.current?.showModal()}>
              + nouveau programmateur
            </Button>
          )}
          {demande && !programmateurId && homonymes !== 1 && (
            <p className="text-sm text-muted-foreground">
              {homonymes === 0
                ? `Aucun programmateur nommé « ${demande.programmateur} » : créez-le.`
                : `Plusieurs programmateurs s'appellent « ${demande.programmateur} » : choisissez le bon.`}
            </p>
          )}
        </Champ>

        <fieldset className="grid gap-2" disabled={fige}>
          <legend className="mb-2 text-sm font-medium">Musiciens (un ou deux)</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            {musiciens.map((m) => (
              <label key={m.id} className="flex items-center gap-1.5">
                <input type="checkbox" name="musiciens" value={m.id} defaultChecked={valeurs.musiciens.includes(m.id)} />
                {m.nom} ({m.instrument})
              </label>
            ))}
          </div>
          <Erreurs liste={err.musiciens} />
        </fieldset>

        <Champ id="cachet" titre="Cachet (facultatif ; 0 pour un concert bénévole)" erreurs={err.cachet ?? err.devise}>
          <div className="flex gap-2">
            <Input id="cachet" name="cachet" inputMode="decimal" className="w-36" defaultValue={valeurs.cachet} disabled={fige} />
            <NativeSelect name="devise" defaultValue={valeurs.devise} aria-label="Devise" disabled={fige}>
              {DEVISES.map((d) => (
                <NativeSelectOption key={d} value={d}>
                  {d}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </Champ>

        <Champ id="programme" titre="Programme (facultatif)" erreurs={err.programme}>
          <textarea id="programme" name="programme" className={classeZoneTexte} defaultValue={valeurs.programme} />
        </Champ>

        <Champ id="notes" titre="Notes (facultatif)" erreurs={err.notes}>
          <textarea id="notes" name="notes" className={classeZoneTexte} defaultValue={valeurs.notes} />
        </Champ>

        {(etat.erreurs || etat.erreur) && (
          <p role="alert" className="text-sm text-destructive">
            {etat.erreur ?? "L'engagement n'a pas été enregistré : corrigez les champs signalés."}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Link href={id ? `/engagements/${id}` : demande ? `/demandes/${demande.id}` : "/engagements"} className="self-center text-sm underline">
            Annuler
          </Link>
          <Button type="submit" disabled={enCours}>
            {enCours ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </form>
      {!fige && <NouveauLieu fenetre={fenetreLieu} onCree={ajouterLieu} />}
      {!fige && <NouveauProgrammateur fenetre={fenetreProgrammateur} nomPropose={demande?.programmateur} onCree={ajouterProgrammateur} />}
    </>
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
