"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  FileText,
  Home,
  Menu,
  ShoppingCart,
  UserCog,
  Users,
  Wrench,
  X,
} from "lucide-react";
import type { UsuarioSesion } from "@/lib/session";
import { LogoutButton } from "@/components/logout-button";

const navItems = [
  { href: "/inicio", label: "Inicio", icon: Home },
  { href: "/ventas", label: "Ventas", icon: FileText },
  { href: "/productos", label: "Productos", icon: Boxes },
  { href: "/clientes", label: "Clientes", icon: Users },
  {
    href: "/usuarios",
    label: "Usuarios",
    icon: UserCog,
    soloAdmin: true,
  },
];

function Navigation({
  pathname,
  isAdmin,
  onNavigate,
}: {
  pathname: string;
  isAdmin: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Navegación principal" className="space-y-1">
      {navItems
        .filter((item) => !item.soloAdmin || isAdmin)
        .map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`) ||
            (item.href === "/ventas" && pathname === "/facturas");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg border-l-[3px] px-3 py-3 text-sm font-medium transition ${
                active
                  ? "border-amber-500 bg-slate-900 text-white"
                  : "border-transparent text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-amber-400" : ""}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/inicio" className="flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-slate-950">
        <Wrench className="h-6 w-6" />
      </span>
      <span>
        <span className="block text-base font-bold leading-tight text-white">
          Repuestos
        </span>
        <span className="text-xs text-[#9daeb4]">Motos y Autos</span>
      </span>
    </Link>
  );
}

export function Sidebar({ user }: { user: UsuarioSesion }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside className="no-print hidden min-h-screen w-[272px] shrink-0 flex-col bg-slate-950 px-4 py-5 text-white md:flex">
        <div className="border-b border-slate-800 px-2 pb-5">
          <Brand />
        </div>
        <Link
          href="/ventas/nueva"
          className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-3 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
        >
          <ShoppingCart className="h-4 w-4" />
          Nueva venta
        </Link>
        <div className="mt-6 flex-1">
          <Navigation pathname={pathname} isAdmin={user.rol === "admin"} />
        </div>
        <div className="border-t border-slate-800 px-2 pt-4 text-xs leading-relaxed text-slate-500">
          <Link
            href="/perfil"
            className="mb-3 block text-sm font-medium text-slate-300 hover:text-white"
          >
            Mi perfil · {user.nombre}
          </Link>
          Comprobantes internos sin validez fiscal.
        </div>
      </aside>

      <div className="no-print relative z-40 border-b border-slate-800 bg-slate-950 px-4 py-3 text-white md:hidden">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
            className="rounded-lg p-2 text-slate-300 hover:bg-slate-800"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Brand />
          <div className="flex items-center gap-2">
            <Link
              href="/perfil"
              aria-label={`Perfil de ${user.nombre}`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15 text-xs font-semibold text-amber-400"
            >
              {user.nombre
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0]?.toLocaleUpperCase())
                .join("")}
            </Link>
            <LogoutButton variant="dark" />
          </div>
        </div>
        {mobileOpen && (
          <div className="absolute left-0 right-0 top-full border-t border-slate-800 bg-slate-950 px-4 pb-4 pt-3 shadow-xl">
            <Link
              href="/ventas/nueva"
              onClick={() => setMobileOpen(false)}
              className="mb-3 flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-3 py-3 text-sm font-semibold text-slate-950"
            >
              <ShoppingCart className="h-4 w-4" />
              Nueva venta
            </Link>
            <Navigation
              pathname={pathname}
              isAdmin={user.rol === "admin"}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        )}
      </div>
    </>
  );
}
