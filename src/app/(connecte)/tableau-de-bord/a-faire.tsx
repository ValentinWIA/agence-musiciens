import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { contratsAEnvoyer, premieres } from "@/lib/a-faire";
import { formaterMontant, type Devise } from "@/lib/argent";
import { jourLocal } from "@/lib/calendrier";
import { formaterJourCourt } from "@/lib/demandes";
import { compterDemandesATraiter, lireEngagementsASuivre } from "@/lib/lecture-a-faire";
import { cachetsImpayes, optionsQuiExpirent } from "@/lib/recap";

type Ligne = { id: string; titre: string | null; musiciens: string[]; detail: string };

// Panneau « À faire » (docs/design.md, passe « envoi ») : les mêmes règles que le récap du matin.
export async function AFaire() {
  const aujourdhui = jourLocal(new Date(), "France");
  const [aSuivre, demandes] = await Promise.all([lireEngagementsASuivre(), compterDemandesATraiter()]);
  const jour = (e: { debut: Date; pays: string }) => formaterJourCourt(jourLocal(e.debut, e.pays));

  const factures = cachetsImpayes(aSuivre, aujourdhui).map((c) => ({
    ...c,
    detail: `${c.ville} · joué le ${jour(c)} · ${formaterMontant(c.cachet!, c.devise as Devise)}`,
  }));
  const contrats = contratsAEnvoyer(aSuivre).map((e) => ({ ...e, detail: `${e.ville} · ${jour(e)}` }));
  const options = optionsQuiExpirent(
    aSuivre.filter((e) => e.statut === "option" && e.expireLe !== null).map((e) => ({ ...e, expireLe: e.expireLe! })),
    aujourdhui,
  ).map((e) => ({ ...e, detail: `${e.ville} · ${e.expireLe < aujourdhui ? "échue le" : "expire le"} ${formaterJourCourt(e.expireLe)}` }));

  const rien = factures.length + contrats.length + options.length + demandes === 0;
  return (
    <Card>
      <CardContent className="grid gap-5">
        <h2 className="font-logo text-2xl">À faire</h2>
        {rien && <p className="text-sm text-muted-foreground">Rien à faire pour l&apos;instant.</p>}
        <Liste titre="Factures à relancer" lignes={factures} />
        <Liste titre="Contrats à envoyer" lignes={contrats} toutes="/engagements?statut=option&periode=tous" />
        <Liste titre="Options qui expirent" lignes={options} />
        {demandes > 0 && (
          <div className="grid gap-2">
            <Intitule titre="Demandes reçues à traiter" nombre={demandes} />
            <Link href="/demandes" className="text-sm underline">
              Ouvrir les demandes reçues →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Une liste vide disparaît : le panneau ne montre que ce qui attend un geste.
function Liste({ titre, lignes, toutes }: { titre: string; lignes: Ligne[]; toutes?: string }) {
  if (lignes.length === 0) return null;
  const { lignes: visibles, reste } = premieres(lignes);
  return (
    <div className="grid gap-1">
      <Intitule titre={titre} nombre={lignes.length} />
      <ul className="divide-y text-sm">
        {visibles.map((l) => (
          <li key={l.id}>
            <Link
              href={`/engagements/${l.id}`}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2 hover:bg-muted/50"
            >
              <span>
                <span className="font-medium">{l.musiciens.join(", ") || "Sans musicien"}</span> — {l.titre ?? "Sans titre"}
              </span>
              <span className="text-muted-foreground">{l.detail}</span>
            </Link>
          </li>
        ))}
      </ul>
      {reste > 0 &&
        (toutes ? (
          <Link href={toutes} className="text-sm underline">
            Voir les {lignes.length} →
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">et {reste} autre{reste > 1 ? "s" : ""}</p>
        ))}
    </div>
  );
}

// Intitulé mis en valeur (retour de l'humain sur la planche) : titre et compteur noir, filet or dessous.
function Intitule({ titre, nombre }: { titre: string; nombre: number }) {
  return (
    <h3 className="flex items-center gap-2 border-b border-or/60 pb-1 font-logo text-xl">
      {titre}
      <span className="rounded-full bg-primary px-2 py-0.5 font-sans text-xs font-medium text-primary-foreground tabular-nums">
        {nombre}
      </span>
    </h3>
  );
}
