const statusStyles = {
  active: "bg-emerald-500/10 text-emerald-300",
  inactive: "bg-slate-700 text-slate-300",
  issued: "bg-emerald-500/10 text-emerald-300",
  cancelled: "bg-red-500/10 text-red-300",
  warning: "bg-amber-500/10 text-amber-300",
} as const;

const statusLabels = {
  active: "Activo",
  inactive: "Inactivo",
  issued: "Emitida",
  cancelled: "Anulada",
  warning: "Atención",
} as const;

export function StatusBadge({
  status,
}: {
  status: keyof typeof statusStyles;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}
