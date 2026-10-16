import { Badge } from "@/components/ui/badge";
import { LIBELLES_STATUT, type Statut } from "@/lib/engagements";

// Gradation dans l'ordre du cycle de vie, du rouge (demande) au vert (payé) : teintes oklch espacées
// régulièrement (25 → 150, environ 21° par étape). Pâle tant que l'engagement n'est pas tenu, plein dès
// « confirmé » (même frontière que la règle de conflit, STATUTS_TENUS). Annulé reste gris barré, hors gradation.
// Le texte reste toujours affiché : la couleur ne porte jamais seule l'information.
// Classes écrites en entier : Tailwind ne reconnaît pas une classe fabriquée par morceaux.
export const COULEURS_STATUT: Record<Statut, string> = {
  // Pas encore tenus : fond pâle, texte de la même teinte.
  demande:
    "border-[oklch(0.78_0.13_25)] bg-[oklch(0.93_0.06_25)] text-[oklch(0.45_0.17_25)] dark:bg-[oklch(0.33_0.09_25)] dark:text-[oklch(0.92_0.05_25)]",
  option:
    "border-[oklch(0.78_0.13_46)] bg-[oklch(0.93_0.07_46)] text-[oklch(0.47_0.15_46)] dark:bg-[oklch(0.34_0.08_46)] dark:text-[oklch(0.92_0.06_46)]",
  contrat_envoye:
    "border-[oklch(0.8_0.13_67)] bg-[oklch(0.94_0.08_67)] text-[oklch(0.48_0.12_67)] dark:bg-[oklch(0.35_0.08_67)] dark:text-[oklch(0.93_0.07_67)]",
  // Tenus : fond plein et saturé, texte foncé.
  confirme: "border-transparent bg-[oklch(0.8_0.15_88)] text-[oklch(0.28_0.06_88)]",
  joue: "border-transparent bg-[oklch(0.88_0.17_108)] text-[oklch(0.3_0.06_108)]",
  facture: "border-transparent bg-[oklch(0.85_0.17_129)] text-[oklch(0.29_0.07_129)]",
  paye: "border-transparent bg-[oklch(0.72_0.16_150)] text-[oklch(0.22_0.06_150)]",
  annule: "border-border bg-muted text-muted-foreground line-through",
};

export function BadgeStatut({ statut }: { statut: Statut }) {
  return (
    <Badge variant="outline" className={COULEURS_STATUT[statut]}>
      {LIBELLES_STATUT[statut]}
    </Badge>
  );
}
