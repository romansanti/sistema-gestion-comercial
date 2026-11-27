"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  LogOut,
  Package,
  ShoppingCart,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";
import type { UsuarioSesion } from "@/lib/session";

const navItems = [
  { href: "/ventas/nueva", label: "Mostrador / Nueva Venta", icon: ShoppingCart },
  { href: "/productos", label: "Repuestos y Stock", icon: Package },
  { href: "/clientes", label: "Clientes y Cta. Cte.", icon: Users },
  { href: "/facturas", label: "Facturas Emitidas", icon: FileText },
  {
    href: "/usuarios",
    label: "Usuarios y Permisos",
    icon: UserCog,
    soloAdmin: true,
  },
];

export function Sidebar({ user }: { user: UsuarioSesion }) {
  const pathname = usePathname();
  const router = useRouter();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLogoutError(null);
    setLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error("No se pudo cerrar la sesión. Intentá nuevamente.");
      }
      router.push("/login");
      router.refresh();
    } catch (error) {
      setLogoutError(
        error instanceof Error ? error.message : "No se pudo cerrar la sesión.",
      );
      setLoggingOut(false);
    }
  }

  return (
    <aside className="flex min-h-screen w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-slate-100 max-lg:w-56 max-md:min-h-0 max-md:w-full max-md:border-r-0 max-md:border-b">
      <div className="flex items-center gap-3 border-b border-slate-800 p-5">
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/15 p-2 text-amber-400">
          <Wrench className="h-5 w-5" />
        </div>
        <div>
          <span className="block text-sm font-bold leading-tight">
            Repuestos Tucumán
          </span>
          <span className="text-xs text-slate-400">Motos &amp; Autos</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3 max-md:flex max-md:flex-wrap">
        {navItems
          .filter((item) => !item.soloAdmin || user.rol === "admin")
          .map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition max-md:grow ${
                  active
                    ? "bg-amber-500 text-slate-950"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
      </nav>

      <div className="space-y-3 border-t border-slate-800 p-4 max-md:flex max-md:items-center max-md:justify-between max-md:border-t-0">
        <div className="min-w-0 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="truncate text-xs font-semibold text-white">{user.nombre}</p>
          <p className="truncate text-[11px] text-slate-400">{user.email}</p>
          <span
            className={`mt-1.5 inline-block rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              user.rol === "admin"
                ? "border-amber-500/30 bg-amber-500/20 text-amber-300"
                : "border-sky-500/30 bg-sky-500/20 text-sky-300"
            }`}
          >
            {user.rol === "admin" ? "Administrador" : "Vendedor"}
          </span>
        </div>

        <div>
          {logoutError && (
            <p role="alert" className="mb-2 text-xs text-red-300">
              {logoutError}
            </p>
          )}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 py-2 text-xs font-medium text-slate-300 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            {loggingOut ? "Cerrando..." : "Cerrar sesión"}
          </button>
        </div>
      </div>
    </aside>
  );
}
