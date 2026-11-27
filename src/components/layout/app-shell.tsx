import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/logout-button";
import { SessionProvider } from "@/components/session-provider";
import { Sidebar } from "@/components/sidebar";
import type { UsuarioSesion } from "@/lib/session";

export function AppShell({
  user,
  children,
}: {
  user: UsuarioSesion;
  children: ReactNode;
}) {
  const initials = user.nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase())
    .join("");

  return (
    <SessionProvider user={user}>
      <div className="flex min-h-screen bg-slate-950 text-slate-100 max-md:flex-col">
        <Sidebar user={user} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="no-print hidden h-[68px] shrink-0 items-center justify-end gap-3 border-b border-slate-800 bg-slate-900 px-8 sm:flex">
            <Link
              href="/perfil"
              className="flex min-w-0 items-center gap-3 rounded-lg px-2 py-1 hover:bg-slate-800"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-sm font-semibold text-amber-400">
                {initials}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block max-w-48 truncate text-sm font-semibold text-white">
                  {user.nombre}
                </span>
                <span className="block text-xs text-slate-400">
                  {user.rol === "admin" ? "Administrador" : "Vendedor"}
                </span>
              </span>
            </Link>
            <LogoutButton variant="dark" />
          </header>
          <main className="min-w-0 flex-1 overflow-x-auto p-8 max-lg:p-6 max-sm:p-4">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
