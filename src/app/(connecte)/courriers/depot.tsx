"use client";

import { startTransition, useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { LIBELLES_MODELE, type Modele } from "@/lib/couts-ia";
import { CHAMPS, CLASSEMENTS, LIBELLES_CHAMP, LIBELLES_CLASSEMENT, type ChampVerifie, type LectureVerifiee } from "@/lib/courrier";
import { lireCourrier, validerCourrier, type EtatLecture, type EtatValidation } from "./actions";

const classeZoneTexte =
  "min-h-48 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const classeResume = classeZoneTexte.replace("min-h-48", "min-h-16");

const MODELES = [
  { valeur: "claude-haiku-5-5", libelle: "Haiku 5.5 (par défaut, ≈ 0,001 $)" },
  { valeur: "claude-sonnet-5-5", libelle: "Sonnet 5.5 (courrier complexe, ≈ 0,015 $)" },
];

function ChoixModele({ modele, setModele }: { modele: string; setModele: (m: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="modele" className="text-xs font-normal text-muted-foreground">
        Lecture par
      </Label>
      <NativeSelect id="modele" size="sm" value={modele} onChange={(e) => setModele(e.target.value)}>
        {MODELES.map((m) => (
          <NativeSelectOption key={m.valeur} value={m.valeur}>
            {m.libelle}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}

// Le courriel ouvert à droite de la boîte (variante A, 26/10) : on le lit, puis « Faire lire par l'IA » ; la relecture
// prend la place du bouton. Le serveur relit le texte du courriel en base (seul son identifiant est envoyé).
export function LectureCourriel({ courriel }: { courriel: { id: string; objet: string; expediteur: string; date: string | null; texte: string } }) {
  const [etat, lire, enLecture] = useActionState<EtatLecture, FormData>(lireCourrier, {});
  const [modele, setModele] = useState(MODELES[0].valeur);
  const lu = etat.lecture && etat.texte && etat.modele;

  return (
    <>
      <div className="grid gap-1 border-b pb-3">
        <h2 className="font-logo text-2xl leading-tight">{courriel.objet}</h2>
        <p className="text-sm break-words text-muted-foreground">
          {courriel.expediteur}
          {courriel.date && ` · ${courriel.date}`}
        </p>
      </div>
      <p className={`text-sm whitespace-pre-line ${lu ? "max-h-40 overflow-y-auto text-muted-foreground" : ""}`}>{courriel.texte}</p>
      {lu ? (
        <Validation key={etat.lectures} lecture={etat.lecture!} texte={etat.texte!} modele={etat.modele!} courriel={courriel.id} />
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <Button
            type="button"
            disabled={enLecture}
            onClick={() => {
              const donnees = new FormData();
              donnees.set("courriel", courriel.id);
              donnees.set("modele", modele);
              startTransition(() => lire(donnees));
            }}
          >
            {enLecture ? "Lecture par l'IA…" : "Faire lire par l'IA"}
          </Button>
          <ChoixModele modele={modele} setModele={setModele} />
        </div>
      )}
      {etat.erreur && (
        <p role="alert" className="text-sm text-destructive">
          {etat.erreur}
        </p>
      )}
    </>
  );
}

// « + Coller un texte ou un PDF » : le dépôt d'avant, à droite de la boîte (téléphone, courrier papier scanné).
export function SaisieManuelle() {
  const [etat, lire, enLecture] = useActionState<EtatLecture, FormData>(lireCourrier, {});
  const [modele, setModele] = useState(MODELES[0].valeur);

  return (
    <>
      <h2 className="border-b pb-3 font-logo text-2xl leading-tight">Coller un texte ou déposer un PDF</h2>
      <form
        // Envoi sans la remise à zéro automatique de React : elle viderait le texte collé après un refus.
        onSubmit={(e) => {
          e.preventDefault();
          const donnees = new FormData(e.currentTarget);
          donnees.set("modele", modele);
          startTransition(() => lire(donnees));
        }}
        className="grid gap-4"
      >
        <div className="grid gap-2">
          <Label htmlFor="texte">Texte du courrier</Label>
          <textarea id="texte" name="texte" className={classeZoneTexte} placeholder="Collez ici le texte du courrier…" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="fichier">ou un fichier (.txt ou .pdf, 2 Mo au plus)</Label>
          <Input id="fichier" name="fichier" type="file" accept=".txt,.pdf,text/plain,application/pdf" className="w-72 max-w-full" />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={enLecture} className="w-fit">
            {enLecture ? "Lecture du courrier par l'IA…" : "Lire le courrier"}
          </Button>
          <ChoixModele modele={modele} setModele={setModele} />
        </div>
        {etat.erreur && (
          <p role="alert" className="text-sm text-destructive">
            {etat.erreur}
          </p>
        )}
      </form>
      {etat.lecture && etat.texte && etat.modele && (
        // Une nouvelle lecture remplace entièrement le formulaire de la précédente.
        <Validation key={etat.lectures} lecture={etat.lecture} texte={etat.texte} modele={etat.modele} />
      )}
    </>
  );
}

function Validation({ lecture, texte, modele, courriel }: { lecture: LectureVerifiee; texte: string; modele: string; courriel?: string }) {
  const [etat, valider, enCours] = useActionState<EtatValidation, FormData>(validerCourrier, {});
  const aRelire = CHAMPS.filter((c) => lecture[c].etat === "a_relire").length;

  if (etat.reussi) {
    return (
      <p role="status" className="text-sm">
        Courrier enregistré : il est dans l&apos;onglet « Enregistrés ».
      </p>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const donnees = new FormData(e.currentTarget);
        startTransition(() => valider(donnees));
      }}
      className="grid gap-4 rounded-lg border p-4"
    >
      <div className="grid gap-1">
        <h2 className="font-logo text-2xl">Relisez avant d&apos;enregistrer</h2>
        <p className="text-sm text-muted-foreground">
          Lu par {LIBELLES_MODELE[modele as Modele] ?? modele}. Chaque champ cite l&apos;extrait du courrier
          qui le justifie ; le site vérifie que cet extrait existe.{" "}
          {aRelire > 0 ? `${aRelire} champ${aRelire > 1 ? "s" : ""} à relire : l'IA a peut-être inventé.` : ""} Rien
          n&apos;est enregistré avant « Enregistrer ».
        </p>
      </div>
      <input type="hidden" name="texte" value={texte} />
      <input type="hidden" name="modele" value={modele} />
      {courriel && <input type="hidden" name="courriel" value={courriel} />}
      {CHAMPS.map((nom) => (
        <ChampLu key={nom} nom={nom} libelle={LIBELLES_CHAMP[nom]} champ={lecture[nom]} />
      ))}
      <div className="grid gap-2">
        <Label htmlFor="classement">Classement</Label>
        <NativeSelect id="classement" name="classement" defaultValue={lecture.classement.valeur}>
          {CLASSEMENTS.map((c) => (
            <NativeSelectOption key={c} value={c}>
              {LIBELLES_CLASSEMENT[c]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <p className="text-xs text-muted-foreground">Proposé par l&apos;IA : {lecture.classement.raison}</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="resume">Résumé (proposé par l&apos;IA, à relire)</Label>
        <textarea id="resume" name="resume" className={classeResume} defaultValue={lecture.resume} maxLength={500} />
      </div>
      <Button type="submit" disabled={enCours} className="w-fit">
        {enCours ? "Enregistrement…" : "Enregistrer"}
      </Button>
      <p className="text-xs text-muted-foreground">
        L&apos;enregistrement ne répond pas à l&apos;expéditeur et ne modifie aucun engagement.
      </p>
      {etat.erreur && (
        <p role="alert" className="text-sm text-destructive">
          {etat.erreur}
        </p>
      )}
    </form>
  );
}

function ChampLu({ nom, libelle, champ }: { nom: string; libelle: string; champ: ChampVerifie }) {
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={nom}>{libelle}</Label>
        <Pastille etat={champ.etat} />
      </div>
      <Input
        id={nom}
        name={nom}
        type={nom === "date" ? "date" : "text"}
        defaultValue={champ.valeur ?? ""}
        className="w-full max-w-md"
      />
      {champ.etat === "verifie" && <p className="text-xs text-muted-foreground">Extrait : « {champ.extrait} »</p>}
      {champ.etat === "a_relire" && (
        <p className="text-xs text-destructive">
          {champ.pourquoi}
          {champ.extrait ? ` (extrait cité : « ${champ.extrait} »)` : ""}.
        </p>
      )}
    </div>
  );
}

function Pastille({ etat }: { etat: ChampVerifie["etat"] }) {
  if (etat === "verifie") return <Badge variant="secondary">vérifié</Badge>;
  if (etat === "absent") return <Badge variant="outline">absent du courrier</Badge>;
  return <Badge variant="destructive">à relire</Badge>;
}
