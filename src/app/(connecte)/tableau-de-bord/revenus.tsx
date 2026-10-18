import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formaterMontant } from "@/lib/argent";
import { lireTaux } from "@/lib/change";
import { listerFichesMusiciens, listerPartsDeCachets } from "@/lib/engagements";
import { revenusDeLaSaison, saisonDe, type Montant } from "@/lib/indicateurs";

// « ≈ 2 500,00 € », ou « 1 500,00 € · 950,00 CHF » quand les taux manquent.
function formaterMontants(montants: Montant[], converti: boolean) {
  if (montants.length === 0) return formaterMontant(0, "EUR");
  return (converti ? "≈ " : "") + montants.map((m) => formaterMontant(m.unites, m.devise)).join(" · ");
}

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
      <CardContent className="grid gap-3">
        <h2 className="font-logo text-2xl">Revenus de la saison</h2>
        {total.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun cachet cette saison.</p>
        ) : (
          <>
            <p className="grid gap-1">
              <span className="font-logo text-3xl leading-none tabular-nums">{formaterMontants(total, converti)}</span>
              <span className="text-sm text-muted-foreground">total des cachets (confirmés, joués, facturés, payés)</span>
            </p>
            <ul className="grid gap-1 text-sm">
              {classes.map((m) => (
                <li key={m.id} className="flex items-baseline justify-between gap-2">
                  <Link href={`/musiciens/${m.id}`} className="truncate hover:underline">
                    {m.nom}
                  </Link>
                  <span className="shrink-0 font-medium tabular-nums">{formaterMontants(parMusicien[m.id] ?? [], converti)}</span>
                </li>
              ))}
            </ul>
            {converti && taux && (
              <p className="text-xs text-muted-foreground">
                Converti au taux BCE du {taux.date.split("-").reverse().join("/")}.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
