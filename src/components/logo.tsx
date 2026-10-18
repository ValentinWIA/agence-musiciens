// Logo fictif de l'agence, « la maison » (choisi le 18/10, docs/design.md) : C et M séparés par un filet or.
// Les lettres prennent la couleur du texte autour : ivoire dans le cadre noir, noir sur fond blanc.
// Sous-titre en or dans le cadre noir seulement : sur blanc, l'or pâle serait illisible en si petit.
export function Embleme({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className}>
      <text x="27" y="66" textAnchor="middle" fontSize="54" fill="currentColor" className="font-logo">
        C
      </text>
      <line x1="50" y1="18" x2="50" y2="82" stroke="var(--or)" strokeWidth="1.6" />
      <text x="74" y="66" textAnchor="middle" fontSize="54" fill="currentColor" className="font-logo">
        M
      </text>
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-3 text-foreground">
      <Embleme className="size-11 shrink-0" />
      <span className="grid leading-tight">
        <span className="font-logo text-xl">CM Management</span>
        <span className="text-[0.62rem] tracking-[0.28em] text-muted-foreground uppercase dark:text-or">Agence de musiciens</span>
      </span>
    </span>
  );
}
