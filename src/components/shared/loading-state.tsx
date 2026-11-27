export function LoadingState({ label = "Cargando..." }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-32 items-center justify-center gap-3 text-sm text-slate-400"
    >
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-amber-400" />
      {label}
    </div>
  );
}
