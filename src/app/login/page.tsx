"use client";

import Link from "next/link";
import { Boxes, Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api, errorText, type SessionUser } from "@/components/data-client";

const demos = [
  { label: "Carlos Navarro · Administrador", email: "carlos.navarro@ruta9repuestos.com", password: "Admin1234!" },
  { label: "Sofía Quiroga · Vendedor", email: "sofia.quiroga@ruta9repuestos.com", password: "Vendedor1234!" },
  { label: "Martín Salazar · Vendedor", email: "martin.salazar@ruta9repuestos.com", password: "Vendedor1234!" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api<SessionUser>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
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
          <span className="showcase-label"><span /> TODO EN UN SOLO LUGAR</span>
          <h1>Tu negocio,<br />siempre en <em>movimiento.</em></h1>
          <p>Ventas, productos y clientes bajo control con una experiencia simple para el mostrador.</p>
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
            <span className="login-heading-icon"><KeyRound size={20} /></span>
            <span className="eyebrow">BIENVENIDO DE VUELTA</span>
            <h2>Iniciá sesión</h2>
            <p>Ingresá tus credenciales para continuar.</p>
          </div>
          <form onSubmit={submit} className="login-form">
            <label className="field">
              <span>Correo electrónico</span>
              <span className="login-input-wrap"><Mail size={17} /><input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@empresa.com" /></span>
            </label>
            <label className="field">
              <span>Contraseña</span>
              <span className="login-input-wrap"><KeyRound size={17} /><input type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Ingresá tu contraseña" /><button type="button" className="password-toggle" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>
            </label>
            {error && <div className="error-banner" role="alert">{error}</div>}
            <button type="submit" className="button button-primary login-submit" disabled={busy}>{busy ? <><span className="loader loader-light" />Ingresando...</> : <>Ingresar <span aria-hidden="true">→</span></>}</button>
          </form>
          <div className="demo-area">
            <div className="demo-caption"><span /> ACCESO RÁPIDO DE DEMOSTRACIÓN <span /></div>
            <div className="demo-buttons">
              {demos.map((demo) => (
                <button key={demo.email} type="button" className="demo-button" onClick={() => { setEmail(demo.email); setPassword(demo.password); setError(""); }}>
                  <span className="demo-avatar">{demo.label.charAt(0)}</span>
                  <span><strong>{demo.label}</strong><small>Completar credenciales</small></span>
                  <span className="demo-arrow">↗</span>
                </button>
              ))}
            </div>
          </div>
          <p className="register-login-link">¿No tenés cuenta? <Link href="/registro">Crear cuenta nueva</Link></p>
          <p className="login-footer">Al continuar, aceptás el uso interno del sistema de gestión.</p>
        </div>
        <div className="login-bottom-line"><span>MotoParts &amp; Ruta 9</span><span>Sistema Integral de Mostrador</span></div>
      </section>
    </main>
  );
}
