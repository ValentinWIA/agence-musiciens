import { initiales } from "@/lib/musiciens";

// Initiales tant que la photo n'existe pas (elle arrive avec la tranche M5). Aucun portrait fictif : jamais le
// visage d'une vraie personne.
export function Portrait({ nom, className = "" }: { nom: string; className?: string }) {
  return (
    <div className={`grid aspect-[4/5] place-items-center bg-accent ${className}`} role="img" aria-label={`Initiales de ${nom}`}>
      <span className="font-logo text-6xl tracking-wide text-primary">{initiales(nom)}</span>
    </div>
  );
}
