import { Badge } from "@/components/ui/badge";
import { LIBELLES_STATUT, type Statut } from "@/lib/engagements";

const VARIANTES: Record<Statut, "default" | "secondary" | "outline" | "destructive"> = {
  demande: "outline",
  option: "secondary",
  contrat_envoye: "secondary",
  confirme: "default",
  joue: "default",
  facture: "default",
  paye: "default",
  annule: "destructive",
};

export function BadgeStatut({ statut }: { statut: Statut }) {
  return <Badge variant={VARIANTES[statut]}>{LIBELLES_STATUT[statut]}</Badge>;
}
