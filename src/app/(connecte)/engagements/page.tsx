import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { BadgeStatut } from "@/components/badge-statut";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formaterMontant } from "@/lib/argent";
import { dateDepassee, estEnCours } from "@/lib/cycle-de-vie";
import { formaterDebut } from "@/lib/dates";
import { LIBELLES_STATUT, listerEngagements, listerMusiciens, listerProgrammateurs, type Filtres, type Statut } from "@/lib/engagements";
import { presenterProgrammateur } from "@/lib/programmateurs";
import { verifierSession } from "@/lib/session";

// Les filtres viennent de l'adresse (?statut=option&periode=tous) : une valeur inconnue est simplement ignorée
// (une ancienne adresse ?periode=passes revient donc à « En cours »).
const schemaFiltres = z.object({
  statut: z.enum(Object.keys(LIBELLES_STATUT) as [keyof typeof LIBELLES_STATUT]).optional().catch(undefined),
  musicien: z.uuid().optional().catch(undefined),
  programmateur: z.uuid().optional().catch(undefined),
  periode: z.enum(["en-cours", "tous"]).catch("en-cours"),
  recherche: z.string().trim().max(100).optional().catch(undefined).transform((t) => t || undefined),
});

export default function PageEngagements({ searchParams }: PageProps<"/engagements">) {
  return (
    <main className="mx-auto grid w-full max-w-6xl gap-4 p-4">
      <Suspense fallback={<ChargementListe />}>
        <ContenuEngagements searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ContenuEngagements({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const utilisateur = await verifierSession();
  const filtres: Filtres = schemaFiltres.parse(await searchParams);
  const estAgent = utilisateur.role === "admin";

  const [liste, musiciens, programmateurs] = await Promise.all([
    listerEngagements(utilisateur, filtres),
    estAgent ? listerMusiciens() : Promise.resolve([]),
    estAgent ? listerProgrammateurs() : Promise.resolve([]),
  ]);
  const filtresActifs = !!(filtres.statut || filtres.musicien || filtres.programmateur || filtres.recherche);
  // Payé ou annulé ne sont jamais « en cours » : on le dit, plutôt qu'une liste vide sans explication.
  const statutHorsEnCours =
    filtres.periode === "en-cours" && filtres.statut && !estEnCours({ statut: filtres.statut, cachet: null });
  const maintenant = new Date();

  return (
    <>
      <h1 className="font-logo text-4xl leading-tight">Engagements</h1>
      {/* Au-dessus des filtres (décidé le 18/10) : entre les filtres et le tableau, il creusait un vide. Seul bouton noir. */}
      {estAgent && (
        <div className="flex justify-end">
          <Button nativeButton={false} render={<Link href="/engagements/nouveau" />}>
            + Nouvel engagement
          </Button>
        </div>
      )}
      {/* Filtres à 12 px du tableau, cases étirées (flex-auto) : la barre a la largeur du tableau. */}
      <div className="grid gap-3">
        <form className="flex flex-wrap items-end gap-3" action="/engagements">
          <NativeSelect name="statut" defaultValue={filtres.statut ?? ""} aria-label="Statut" className="flex-auto">
            <NativeSelectOption value="">Tous les statuts</NativeSelectOption>
            {Object.entries(LIBELLES_STATUT).map(([valeur, libelle]) => (
              <NativeSelectOption key={valeur} value={valeur}>
                {libelle}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {estAgent && (
            <NativeSelect name="musicien" defaultValue={filtres.musicien ?? ""} aria-label="Musicien" className="flex-auto">
              <NativeSelectOption value="">Tous les musiciens</NativeSelectOption>
              {musiciens.map((m) => (
                <NativeSelectOption key={m.id} value={m.id}>
                  {m.nom}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
          {/* Regroupe ce qui concerne un même programmateur (facturation globale) ; « Nom — Structure » distingue les homonymes.
              Largeur fixe : sinon la case prend celle du libellé le plus long (le nom entier reste lisible à l'ouverture). */}
          {estAgent && (
            <NativeSelect name="programmateur" defaultValue={filtres.programmateur ?? ""} aria-label="Programmateur" className="w-56 flex-auto">
              <NativeSelectOption value="">Tous les programmateurs</NativeSelectOption>
              {programmateurs.map((p) => (
                <NativeSelectOption key={p.id} value={p.id}>
                  {presenterProgrammateur(p)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
          <NativeSelect name="periode" defaultValue={filtres.periode} aria-label="Période" className="flex-auto">
            <NativeSelectOption value="en-cours">En cours</NativeSelectOption>
            <NativeSelectOption value="tous">Tous</NativeSelectOption>
          </NativeSelect>
          <Input name="recherche" defaultValue={filtres.recherche} placeholder="Lieu, ville, titre…" className="w-48 flex-auto" />
          <Button type="submit" variant="outline" className="flex-auto">
            Filtrer
          </Button>
          {filtresActifs && (
            <Link href={`/engagements?periode=${filtres.periode}`} className="text-sm underline">
              Effacer les filtres
            </Link>
          )}
        </form>

        {statutHorsEnCours ? (
          <p className="text-muted-foreground">
            Aucun engagement en cours avec ce statut.{" "}
            <Link href={`/engagements?${new URLSearchParams({ ...lienFiltres(filtres), periode: "tous" })}`} className="underline">
              Voir dans Tous
            </Link>
          </p>
        ) : liste.length === 0 ? (
          <p className="text-muted-foreground">
            {filtresActifs
              ? `Aucun engagement${filtres.periode === "en-cours" ? " en cours" : ""} ne correspond à ces filtres.`
              : filtres.periode === "en-cours"
                ? "Aucun engagement en cours."
                : "Aucun engagement pour l'instant."}
          </p>
        ) : (
          <>
            {/* Sur téléphone, une carte par engagement (choix D sur planche, 19/10) : date et statut en haut, sans défilement
                de côté. Toute la carte est le lien. Le tableau reste à partir de 768 px. */}
            <ul className="grid gap-2 md:hidden">
              {liste.map((e) => (
                <li key={e.id}>
                  <Link href={`/engagements/${e.id}`} className="grid gap-1 rounded-lg border bg-card p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <span>
                        <span className="font-medium">{formaterDebut(e.debut, e.precisionDate, e.pays)}</span>
                        {STATUTS_A_REGLER.includes(e.statut) && dateDepassee(e, e.pays, maintenant) && (
                          <span className="block text-xs text-muted-foreground">date passée</span>
                        )}
                      </span>
                      <BadgeStatut statut={e.statut} />
                    </div>
                    <div className="text-sm">{e.musiciens.map((m) => `${m.nom} (${m.instrument})`).join(", ")}</div>
                    <div className="text-sm text-muted-foreground">
                      {e.titre && <span className="font-medium text-foreground">{e.titre} · </span>}
                      {e.lieu}, {e.ville}
                    </div>
                    <div className="text-right text-sm font-medium">
                      {e.cachet === null ? "—" : formaterMontant(e.cachet, e.devise)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Musiciens</TableHead>
                    <TableHead>Lieu</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Cachet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liste.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <Link href={`/engagements/${e.id}`} className="underline">
                          {formaterDebut(e.debut, e.precisionDate, e.pays)}
                        </Link>
                        {/* Une demande, une option ou un contrat envoyé dont la date est passée : à régler ou à annuler.
                            Sous la date, pour garder la colonne étroite. */}
                        {STATUTS_A_REGLER.includes(e.statut) && dateDepassee(e, e.pays, maintenant) && (
                          <span className="block text-xs text-muted-foreground">date passée</span>
                        )}
                      </TableCell>
                      <TableCell className="min-w-40 whitespace-normal">{e.musiciens.map((m) => `${m.nom} (${m.instrument})`).join(", ")}</TableCell>
                      <TableCell className="min-w-48 whitespace-normal">
                        {e.titre && <div className="font-medium">{e.titre}</div>}
                        {e.lieu}, {e.ville}
                      </TableCell>
                      <TableCell>
                        <BadgeStatut statut={e.statut} />
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {e.cachet === null ? "—" : formaterMontant(e.cachet, e.devise)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </>
  );
}

const STATUTS_A_REGLER: readonly Statut[] = ["demande", "option", "contrat_envoye"];

// Les filtres renseignés, pour refaire une adresse (sans les champs vides).
function lienFiltres(filtres: Filtres): Record<string, string> {
  return Object.fromEntries(Object.entries(filtres).filter(([, v]) => v)) as Record<string, string>;
}

function ChargementListe() {
  return (
    <div className="grid gap-3" aria-label="Chargement des engagements">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  );
}
