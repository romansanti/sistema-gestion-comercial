import type { ReactNode } from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { obtenerUsuarioActual } from "@/lib/session";

async function AuthenticatedDashboard({
  children,
}: {
  children: ReactNode;
}) {
  const user = await obtenerUsuarioActual();
  if (!user) redirect("/login");

  return <AppShell user={user}>{children}</AppShell>;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 p-8 text-sm text-slate-400">
          Cargando sesión...
        </div>
      }
    >
      <AuthenticatedDashboard>{children}</AuthenticatedDashboard>
    </Suspense>
  );
}
