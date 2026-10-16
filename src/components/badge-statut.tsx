import { Badge } from "@/components/ui/badge";
import { LIBELLES_STATUT, type Statut } from "@/lib/engagements";

// Gradation dans l'ordre du cycle de vie, du rouge (demande) au vert (payé) en passant par l'orange et le jaune
// (teinte oklch de 25 à 150). Annulé reste gris, hors gradation : ce n'est pas une étape.
// Le texte reste toujours affiché : la couleur ne porte jamais seule l'information.
// Classes écrites en entier : Tailwind ne reconnaît pas une classe fabriquée par morceaux.
const COULEURS: Record<Statut, string> = {
  demande:
    "border-[oklch(0.82_0.1_25)] bg-[oklch(0.94_0.05_25)] text-[oklch(0.42_0.15_25)] dark:bg-[oklch(0.33_0.08_25)] dark:text-[oklch(0.92_0.05_25)]",
  option:
    "border-[oklch(0.83_0.1_50)] bg-[oklch(0.94_0.06_50)] text-[oklch(0.45_0.13_50)] dark:bg-[oklch(0.34_0.07_50)] dark:text-[oklch(0.92_0.05_50)]",
  contrat_envoye:
    "border-[oklch(0.85_0.1_65)] bg-[oklch(0.95_0.06_65)] text-[oklch(0.47_0.12_65)] dark:bg-[oklch(0.35_0.07_65)] dark:text-[oklch(0.93_0.05_65)]",
  confirme:
    "border-[oklch(0.86_0.11_75)] bg-[oklch(0.95_0.07_75)] text-[oklch(0.48_0.11_75)] dark:bg-[oklch(0.36_0.07_75)] dark:text-[oklch(0.93_0.06_75)]",
  joue:
    "border-[oklch(0.87_0.12_85)] bg-[oklch(0.96_0.08_85)] text-[oklch(0.48_0.1_85)] dark:bg-[oklch(0.37_0.07_85)] dark:text-[oklch(0.94_0.06_85)]",
  facture:
    "border-[oklch(0.88_0.13_100)] bg-[oklch(0.96_0.09_100)] text-[oklch(0.47_0.1_100)] dark:bg-[oklch(0.38_0.07_100)] dark:text-[oklch(0.94_0.07_100)]",
  paye:
    "border-[oklch(0.83_0.1_150)] bg-[oklch(0.94_0.06_150)] text-[oklch(0.42_0.12_150)] dark:bg-[oklch(0.34_0.07_150)] dark:text-[oklch(0.92_0.05_150)]",
  annule: "border-border bg-muted text-muted-foreground line-through",
};

export function BadgeStatut({ statut }: { statut: Statut }) {
  return (
    <Badge variant="outline" className={COULEURS[statut]}>
      {LIBELLES_STATUT[statut]}
    </Badge>
  );
}
