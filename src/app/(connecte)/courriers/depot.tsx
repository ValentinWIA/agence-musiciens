"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { LIBELLES_MODELE, type Modele } from "@/lib/couts-ia";
import { CHAMPS, CLASSEMENTS, LIBELLES_CHAMP, LIBELLES_CLASSEMENT, type ChampVerifie, type LectureVerifiee } from "@/lib/courrier";
import { lireCourrier, validerCourrier, type EtatLecture, type EtatValidation } from "./actions";
import { ImportDossier } from "./import-dossier";

const classeZoneTexte =
  "min-h-48 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const classeResume = classeZoneTexte.replace("min-h-48", "min-h-16");

export type CourrielListe = { id: string; objet: string; expediteur: string; date: string | null; texte: string; courrierId: string | null };

// Une seule boîte (retour du 26/10) : importer un dossier, puis « Traiter » chaque courriel sur sa ligne (lecture par
// l'IA, relecture juste dessous). Coller un texte ou déposer un PDF reste possible, replié (téléphone, courrier papier).
export function BoiteCourriers({ courriels }: { courriels: CourrielListe[] }) {
  const [etat, lire, enLecture] = useActionState<EtatLecture, FormData>(lireCourrier, {});
  const [modele, setModele] = useState<string>("claude-haiku-5-5");
  const [enTraitement, setEnTraitement] = useState<string | null>(null); // le courriel dont la lecture est en cours

  const traiter = (id: string) => {
    const donnees = new FormData();
    donnees.set("courriel", id);
    donnees.set("modele", modele);
    setEnTraitement(id);
    startTransition(() => lire(donnees));
  };
  const lecture = etat.lecture && etat.texte && etat.modele && (
    // Une nouvelle lecture remplace entièrement le formulaire de la précédente.
    <Validation key={etat.lectures} lecture={etat.lecture} texte={etat.texte} modele={etat.modele} courriel={etat.courriel} />
  );
  const ligneOuverte = enLecture ? enTraitement : (etat.courriel ?? null);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ImportDossier />
        <div className="flex items-center gap-2">
          <Label htmlFor="modele" className="text-sm font-normal text-muted-foreground">
            Lecture par
          </Label>
          <NativeSelect id="modele" value={modele} onChange={(e) => setModele(e.target.value)}>
            <NativeSelectOption value="claude-haiku-5-5">Haiku 5.5 (par défaut, ≈ 0,001 $)</NativeSelectOption>
            <NativeSelectOption value="claude-sonnet-5-5">Sonnet 5.5 (courrier complexe, ≈ 0,015 $)</NativeSelectOption>
          </NativeSelect>
        </div>
      </div>

      {courriels.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun courriel importé.</p>
      ) : (
        <ul className="text-sm">
          {courriels.map((c) => (
            <li key={c.id} className="border-t py-2 first:border-t-0">
              <div className={`grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-baseline gap-x-4 ${c.courrierId ? "text-muted-foreground" : ""}`}>
                <span className="whitespace-nowrap">{c.date ?? "—"}</span>
                <details className="min-w-0">
                  <summary className="cursor-pointer">
                    <span className="font-medium">{c.objet}</span> · {c.expediteur}
                  </summary>
                  <p className="mt-2 max-h-64 overflow-y-auto whitespace-pre-line rounded-md bg-muted p-3 text-xs">{c.texte}</p>
                </details>
                {c.courrierId ? (
                  <Link href={`/courriers/${c.courrierId}`} className="whitespace-nowrap underline">
                    traité · voir le courrier →
                  </Link>
                ) : (
                  <Button type="button" size="sm" onClick={() => traiter(c.id)} disabled={enLecture}>
                    {enLecture && enTraitement === c.id ? "Lecture par l'IA…" : "Traiter"}
                  </Button>
                )}
              </div>
              {ligneOuverte === c.id && !enLecture && (
                <div className="mt-3 grid gap-3">
                  {etat.erreur && (
                    <p role="alert" className="text-sm text-destructive">
                      {etat.erreur}
                    </p>
                  )}
                  {lecture}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <details className="rounded-lg border p-4">
        <summary className="cursor-pointer text-sm font-medium">Coller un texte ou déposer un PDF</summary>
        <form
          // Envoi sans la remise à zéro automatique de React : elle viderait le texte collé après un refus.
          onSubmit={(e) => {
            e.preventDefault();
            const donnees = new FormData(e.currentTarget);
            donnees.set("modele", modele);
            setEnTraitement(null);
            startTransition(() => lire(donnees));
          }}
          className="mt-4 grid gap-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="texte">Texte du courrier</Label>
            <textarea id="texte" name="texte" className={classeZoneTexte} placeholder="Collez ici le texte du courrier…" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fichier">ou un fichier (.txt ou .pdf, 2 Mo au plus)</Label>
            <Input id="fichier" name="fichier" type="file" accept=".txt,.pdf,text/plain,application/pdf" className="w-72" />
          </div>
          <Button type="submit" disabled={enLecture} className="w-fit">
            {enLecture && enTraitement === null ? "Lecture du courrier par l'IA…" : "Lire le courrier"}
          </Button>
        </form>
        {/* Résultat du dépôt manuel, hors du formulaire de dépôt (un formulaire n'en contient pas un autre). */}
        {enTraitement === null && !enLecture && (
          <div className="mt-4 grid gap-3">
            {etat.erreur && (
              <p role="alert" className="text-sm text-destructive">
                {etat.erreur}
              </p>
            )}
            {lecture}
          </div>
        )}
      </details>
    </div>
  );
}

function Validation({ lecture, texte, modele, courriel }: { lecture: LectureVerifiee; texte: string; modele: string; courriel?: string }) {
  const [etat, valider, enCours] = useActionState<EtatValidation, FormData>(validerCourrier, {});
  const aRelire = CHAMPS.filter((c) => lecture[c].etat === "a_relire").length;

  if (etat.reussi) {
    return (
      <p role="status" className="text-sm">
        Courrier enregistré : il apparaît dans « Courriers enregistrés », plus bas.
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
