import type { ReactNode } from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SessionProvider } from "@/components/session-provider";
import { Sidebar } from "@/components/sidebar";
import { obtenerUsuarioActual } from "@/lib/session";

async function AuthenticatedDashboard({
  children,
}: {
  children: ReactNode;
}) {
  const user = await obtenerUsuarioActual();
  if (!user) redirect("/login");

  return (
    <SessionProvider user={user}>
      <div className="flex min-h-screen bg-slate-950 text-slate-100 max-md:flex-col">
        <Sidebar user={user} />
        <main className="min-w-0 flex-1 overflow-x-auto p-6 max-sm:p-4">
          {children}
        </main>
      </div>
    </SessionProvider>
  );
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
