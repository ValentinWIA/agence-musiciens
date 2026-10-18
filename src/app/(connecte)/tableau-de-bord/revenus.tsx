import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { lireTaux } from "@/lib/change";
import { listerFichesMusiciens, listerPartsDeCachets } from "@/lib/engagements";
import { formaterRevenus, periodeSaison, revenusDeLaSaison, saisonDe } from "@/lib/indicateurs";

// Chiffre d'affaires de la saison (total des cachets) et part de chaque musicien, du plus gros au plus petit.
export async function Revenus() {
  const saison = saisonDe(new Date(), "France");
  const [parts, musiciens] = await Promise.all([listerPartsDeCachets(), listerFichesMusiciens()]);
  // Taux lus seulement s'il y a un cachet en devise étrangère.
  const taux = parts.some((p) => p.devise !== "EUR") ? await lireTaux() : null;
  const { total, parMusicien, converti } = revenusDeLaSaison(parts, saison, taux);
  const enEuros = (id: string) => parMusicien[id]?.find((m) => m.devise === "EUR")?.unites ?? 0;
  const classes = [...musiciens].sort((a, b) => enEuros(b.id) - enEuros(a.id));

  return (
    <Card>
      <CardContent className="grid justify-items-center gap-3 text-center">
        <h2 className="grid font-logo text-2xl">
          Revenus de la saison
          <span className="font-sans text-xs font-normal text-muted-foreground">{periodeSaison(saison)}</span>
        </h2>
        {total.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun cachet cette saison.</p>
        ) : (
          <>
            <p className="grid gap-1">
              <span className="font-logo text-3xl leading-none tabular-nums">{formaterRevenus(total, converti)}</span>
              <span className="text-sm text-muted-foreground">total des cachets (confirmés, joués, facturés, payés)</span>
            </p>
            <ul className="grid w-full gap-1 text-left text-sm">
              {classes.map((m) => (
                <li key={m.id} className="flex items-baseline justify-between gap-2">
                  <Link href={`/musiciens/${m.id}`} className="truncate hover:underline">
                    {m.nom}
                  </Link>
                  <span className="shrink-0 font-medium tabular-nums">{formaterRevenus(parMusicien[m.id] ?? [], converti)}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Un cachet à plusieurs est partagé à parts égales.
              {converti && taux && ` Converti au taux BCE du ${taux.date.split("-").reverse().join("/")}.`}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
