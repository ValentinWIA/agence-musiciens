import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { BadgeStatut } from "@/components/badge-statut";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formaterMontant } from "@/lib/argent";
import { formaterDebut } from "@/lib/dates";
import { LIBELLES_STATUT, listerEngagements, listerMusiciens, type Filtres } from "@/lib/engagements";
import { verifierSession } from "@/lib/session";

// Les filtres viennent de l'adresse (?statut=option&periode=passes) : une valeur inconnue est simplement ignorée.
const schemaFiltres = z.object({
  statut: z.enum(Object.keys(LIBELLES_STATUT) as [keyof typeof LIBELLES_STATUT]).optional().catch(undefined),
  musicien: z.uuid().optional().catch(undefined),
  periode: z.enum(["a-venir", "passes"]).catch("a-venir"),
  recherche: z.string().trim().max(100).optional().catch(undefined).transform((t) => t || undefined),
});

export default function PageEngagements({ searchParams }: PageProps<"/engagements">) {
  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 p-4">
      <Link href="/tableau-de-bord" className="text-sm underline">
        ← Tableau de bord
      </Link>
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

  const [liste, musiciens] = await Promise.all([
    listerEngagements(utilisateur, filtres),
    estAgent ? listerMusiciens() : Promise.resolve([]),
  ]);
  const filtresActifs = !!(filtres.statut || filtres.musicien || filtres.recherche);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Engagements</h1>
        {estAgent && (
          <Button nativeButton={false} render={<Link href="/engagements/nouveau" />}>
            + Nouvel engagement
          </Button>
        )}
      </div>
      <form className="flex flex-wrap items-end gap-3" action="/engagements">
        <NativeSelect name="statut" defaultValue={filtres.statut ?? ""} aria-label="Statut">
          <NativeSelectOption value="">Tous les statuts</NativeSelectOption>
          {Object.entries(LIBELLES_STATUT).map(([valeur, libelle]) => (
            <NativeSelectOption key={valeur} value={valeur}>
              {libelle}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {estAgent && (
          <NativeSelect name="musicien" defaultValue={filtres.musicien ?? ""} aria-label="Musicien">
            <NativeSelectOption value="">Tous les musiciens</NativeSelectOption>
            {musiciens.map((m) => (
              <NativeSelectOption key={m.id} value={m.id}>
                {m.nom}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )}
        <NativeSelect name="periode" defaultValue={filtres.periode} aria-label="Période">
          <NativeSelectOption value="a-venir">À venir</NativeSelectOption>
          <NativeSelectOption value="passes">Passés</NativeSelectOption>
        </NativeSelect>
        <Input name="recherche" defaultValue={filtres.recherche} placeholder="Lieu, ville, titre…" className="w-48" />
        <Button type="submit">Filtrer</Button>
        {filtresActifs && (
          <Link href={`/engagements?periode=${filtres.periode}`} className="text-sm underline">
            Effacer les filtres
          </Link>
        )}
      </form>

      {liste.length === 0 ? (
        <p className="text-muted-foreground">
          {filtresActifs ? "Aucun engagement ne correspond à ces filtres." : "Aucun engagement pour l'instant."}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Lieu</TableHead>
              <TableHead>Musiciens</TableHead>
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
                </TableCell>
                <TableCell className="min-w-48 whitespace-normal">
                  {e.titre && <div className="font-medium">{e.titre}</div>}
                  {e.lieu}, {e.ville}
                </TableCell>
                <TableCell className="min-w-40 whitespace-normal">{e.musiciens.map((m) => `${m.nom} (${m.instrument})`).join(", ")}</TableCell>
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
      )}
    </>
  );
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
