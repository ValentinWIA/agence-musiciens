// Logo fictif de l'agence, affiché en tête de chaque page (voir src/app/layout.tsx).
export function Logo() {
  return (
    <span className="inline-flex items-center gap-3 text-foreground">
      <span
        aria-hidden
        className="grid size-10 place-items-center rounded-sm border border-foreground/70 font-logo text-xl leading-none tracking-tight"
      >
        CM
      </span>
      <span className="grid leading-tight">
        <span className="font-logo text-xl">CM Management</span>
        <span className="text-[0.65rem] tracking-[0.25em] text-muted-foreground uppercase">Agence de musiciens</span>
      </span>
    </span>
  );
}
