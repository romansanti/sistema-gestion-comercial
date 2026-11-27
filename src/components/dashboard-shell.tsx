"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Boxes,
  ChevronDown,
  CircleUserRound,
  ClipboardList,
  Gauge,
  LogOut,
  Menu,
  PackageSearch,
  Settings,
  ShoppingCart,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, errorText, type SessionUser } from "./data-client";
import { ToastViewport } from "./toast";

const navigation = [
  { href: "/inicio", label: "Inicio", icon: Gauge },
  { href: "/ventas", label: "Ventas", icon: ShoppingCart },
  { href: "/ventas/nueva", label: "Nueva venta", icon: ClipboardList },
  { href: "/productos", label: "Productos", icon: Boxes },
  { href: "/clientes", label: "Clientes", icon: UsersRound },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const isAdminPage = pathname === "/usuarios";

  useEffect(() => {
    let active = true;
    api<SessionUser>("/api/auth/me")
      .then((session) => {
        if (!active) return;
        if (isAdminPage && session.rol !== "admin") {
          router.replace("/inicio");
          return;
        }
        setUser(session);
      })
      .catch(() => {
        if (active) router.replace("/login");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAdminPage, pathname, router]);

  const pageTitle = useMemo(() => {
    const item = [...navigation, { href: "/usuarios", label: "Usuarios" }, { href: "/perfil", label: "Mi perfil" }]
      .find((entry) => entry.href === pathname);
    return item?.label ?? (pathname.startsWith("/ventas/") ? "Nueva venta" : "MotoParts & Ruta 9");
  }, [pathname]);

  async function logout() {
    setError("");
    try {
      await api("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch (reason) {
      setError(errorText(reason));
    }
  }

  const nav = (
    <>
      <div className="sidebar-section-label">MENÚ PRINCIPAL</div>
      <nav className="sidebar-nav" aria-label="Navegación principal">
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href === "/ventas" && pathname.startsWith("/ventas/") && pathname !== "/ventas/nueva");
          return (
            <Link
              key={href}
              href={href}
              className={`nav-link ${active ? "nav-link-active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {href === "/ventas/nueva" && <span className="nav-shortcut">+</span>}
            </Link>
          );
        })}
        {user?.rol === "admin" && (
          <Link
            href="/usuarios"
            className={`nav-link ${pathname === "/usuarios" ? "nav-link-active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            <UsersRound size={18} strokeWidth={1.8} />
            <span>Usuarios</span>
          </Link>
        )}
      </nav>
      <div className="sidebar-section-label sidebar-section-lower">PREFERENCIAS</div>
      <Link
        href="/perfil"
        className={`nav-link ${pathname === "/perfil" ? "nav-link-active" : ""}`}
        onClick={() => setMenuOpen(false)}
      >
        <Settings size={18} strokeWidth={1.8} />
        <span>Mi perfil</span>
      </Link>
      <div className="sidebar-help">
        <div className="sidebar-help-icon"><PackageSearch size={19} /></div>
        <strong>¿Necesitás ayuda?</strong>
        <p>Consultá con el administrador del sistema.</p>
      </div>
    </>
  );

  return (
    <div className="app-frame">
      <ToastViewport />
      <aside className="sidebar">
        <Link href="/inicio" className="brand">
          <span className="brand-mark"><Boxes size={21} /></span>
          <span className="brand-copy"><strong>MotoParts &amp; Ruta 9</strong><small>REPUESTOS Y LUBRICANTES</small><small>Sistema Integral de Mostrador</small></span>
        </Link>
        <div className="sidebar-content">{nav}</div>
        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <span className="avatar">{user?.nombre?.slice(0, 1).toUpperCase() ?? "R"}</span>
            <span className="sidebar-user-copy">
              <strong>{user?.nombre ?? "Cuenta"}</strong>
              <small>{user?.rol === "admin" ? "Administrador" : "Vendedor"}</small>
            </span>
            <button type="button" className="icon-button sidebar-logout" aria-label="Cerrar sesión" onClick={logout}>
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      <div className="mobile-sidebar-backdrop" data-open={menuOpen} onClick={() => setMenuOpen(false)} />
      <aside className={`mobile-sidebar ${menuOpen ? "mobile-sidebar-open" : ""}`}>
        <div className="mobile-sidebar-header">
          <Link href="/inicio" className="brand" onClick={() => setMenuOpen(false)}>
            <span className="brand-mark"><Boxes size={21} /></span>
            <span className="brand-copy"><strong>MotoParts &amp; Ruta 9</strong><small>REPUESTOS Y LUBRICANTES</small><small>Sistema Integral de Mostrador</small></span>
          </Link>
          <button type="button" className="icon-button" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)}><X size={20} /></button>
        </div>
        <div className="sidebar-content">{nav}</div>
        <div className="sidebar-bottom">
          <div className="sidebar-user"><span className="avatar">{user?.nombre?.slice(0, 1).toUpperCase() ?? "R"}</span><span className="sidebar-user-copy"><strong>{user?.nombre ?? "Cuenta"}</strong><small>{user?.rol === "admin" ? "Administrador" : "Vendedor"}</small></span><button type="button" className="icon-button" aria-label="Cerrar sesión" onClick={logout}><LogOut size={17} /></button></div>
        </div>
      </aside>

      <main className="main-column">
        <header className="topbar">
          <div className="topbar-title">
            <button type="button" className="icon-button mobile-menu-button" aria-label="Abrir menú" onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
            <div className="breadcrumbs"><span>Panel de gestión</span><span className="crumb-slash">/</span><strong>{pageTitle}</strong></div>
          </div>
          <div className="topbar-actions">
            <span className="topbar-date">Sistema Integral de Mostrador</span>
            <div className="profile-wrap">
              <button type="button" className="profile-button" onClick={() => setProfileOpen(!profileOpen)} aria-expanded={profileOpen}>
                <span className="avatar avatar-small">{user?.nombre?.slice(0, 1).toUpperCase() ?? "R"}</span>
                <span className="profile-identity">
                  <strong className="profile-name">{user?.nombre ?? "Cargando..."}</strong>
                  <small>{user?.email}</small>
                </span>
                {user && <span className={`role-badge ${user.rol === "admin" ? "role-admin" : "role-seller"}`}>{user.rol === "admin" ? "Administrador" : "Vendedor"}</span>}
                <ChevronDown size={15} />
              </button>
              {profileOpen && <div className="profile-menu"><Link href="/perfil" onClick={() => setProfileOpen(false)}><CircleUserRound size={16} /> Mi perfil</Link><button type="button" onClick={logout}><LogOut size={16} /> Cerrar sesión</button></div>}
            </div>
            <button type="button" className="button button-secondary topbar-logout" onClick={logout}><LogOut size={15} /> Salir</button>
          </div>
        </header>
        <div className="content-area">
          {error && <div className="shell-error" role="alert">{error}<button onClick={() => setError("")}>Cerrar</button></div>}
          {loading ? (
            <div className="shell-loading"><span className="loader" />Verificando sesión segura...</div>
          ) : user ? children : null}
        </div>
        <footer className="app-footer"><span>MotoParts &amp; Ruta 9 — Repuestos y Lubricantes</span><span>Sistema Integral de Mostrador</span></footer>
      </main>
    </div>
  );
}
