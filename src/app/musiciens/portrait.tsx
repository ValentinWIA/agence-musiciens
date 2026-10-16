import { initiales } from "@/lib/musiciens";

// La photo si le musicien en a une (servie par la route protégée), sinon ses initiales.
export function Portrait({ nom, photo, className = "" }: { nom: string; photo?: string | null; className?: string }) {
  if (photo) {
    // <img> plutôt que next/image : l'optimiseur d'images irait chercher la photo sans la session du visiteur,
    // et la route protégée lui répondrait « introuvable ».
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt={`Portrait de ${nom}`} className={`aspect-[4/5] w-full object-cover ${className}`} />;
  }
  return (
    <div className={`grid aspect-[4/5] place-items-center bg-accent ${className}`} role="img" aria-label={`Initiales de ${nom}`}>
      <span className="font-logo text-6xl tracking-wide text-primary">{initiales(nom)}</span>
    </div>
  );
}
