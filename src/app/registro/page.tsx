"use client";

import Link from "next/link";
import { Boxes, Eye, EyeOff, KeyRound, Mail, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api, errorText, type SessionUser } from "@/components/data-client";

export default function RegistroPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<"admin" | "vendedor">("vendedor");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api<SessionUser>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          nombre,
          email,
          password,
          ...(process.env.NODE_ENV !== "production" ? { rol } : {}),
        }),
      });
      router.replace("/inicio");
      router.refresh();
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-showcase">
        <div className="login-brand">
          <span className="brand-mark brand-mark-light"><Boxes size={22} /></span>
          <span className="brand-copy"><strong>MotoParts &amp; Ruta 9</strong><small>REPUESTOS Y LUBRICANTES</small></span>
        </div>
        <div className="login-showcase-copy">
          <span className="showcase-label"><span /> SISTEMA INTEGRAL DE MOSTRADOR</span>
          <h1>Tu ruta,<br />siempre en <em>marcha.</em></h1>
          <p>Creá tu cuenta para gestionar ventas, repuestos y clientes desde un mismo lugar.</p>
        </div>
        <div className="showcase-bottom">
          <div className="showcase-stat"><strong>360°</strong><span>Visibilidad completa<br />de tu operación</span></div>
          <div className="showcase-stat"><strong>100%</strong><span>Tu gestión, clara<br />y organizada</span></div>
        </div>
        <div className="showcase-orbit showcase-orbit-one" />
        <div className="showcase-orbit showcase-orbit-two" />
      </section>
      <section className="login-side">
        <div className="login-mobile-brand">
          <span className="brand-mark"><Boxes size={20} /></span>
          <span className="brand-copy"><strong>MotoParts &amp; Ruta 9</strong><small>SISTEMA INTEGRAL DE MOSTRADOR</small></span>
        </div>
        <div className="login-card">
          <div className="login-heading">
            <span className="login-heading-icon"><UserRound size={20} /></span>
            <span className="eyebrow">NUEVA CUENTA</span>
            <h2>Crear cuenta</h2>
            <p>Completá tus datos para empezar a usar el sistema.</p>
          </div>
          <form onSubmit={submit} className="login-form">
            <label className="field">
              <span>Nombre completo</span>
              <span className="login-input-wrap"><UserRound size={17} /><input type="text" autoComplete="name" minLength={3} maxLength={120} required value={nombre} onChange={(event) => setNombre(event.target.value)} placeholder="Tu nombre y apellido" /></span>
            </label>
            <label className="field">
              <span>Correo electrónico</span>
              <span className="login-input-wrap"><Mail size={17} /><input type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@empresa.com" /></span>
            </label>
            <label className="field">
              <span>Contraseña</span>
              <span className="login-input-wrap"><KeyRound size={17} /><input type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 8 caracteres" /><button type="button" className="password-toggle" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>
            </label>
            {process.env.NODE_ENV !== "production" && (
              <label className="field">
                <span>Rol de prueba</span>
                <select className="input select-input" value={rol} onChange={(event) => setRol(event.target.value as "admin" | "vendedor")}>
                  <option value="vendedor">Vendedor</option>
                  <option value="admin">Administrador</option>
                </select>
                <small>La selección de administrador solo está habilitada fuera de producción.</small>
              </label>
            )}
            {error && <div className="error-banner" role="alert">{error}</div>}
            <button type="submit" className="button button-primary login-submit" disabled={busy}>{busy ? <><span className="loader loader-light" />Creando cuenta...</> : <>Crear cuenta <span aria-hidden="true">→</span></>}</button>
          </form>
          <p className="register-login-link">¿Ya tenés cuenta? <Link href="/login">Iniciar sesión</Link></p>
        </div>
        <div className="login-bottom-line"><span>MotoParts &amp; Ruta 9</span><span>Sistema Integral de Mostrador</span></div>
      </section>
    </main>
  );
}
