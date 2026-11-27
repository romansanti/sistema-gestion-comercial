"use client";

import { KeyRound, Mail, ShieldCheck, UserRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Button, ErrorBanner, Field, Loading, PageHeader, Panel, TextInput } from "@/components/app-ui";
import { api, errorText, type SessionUser } from "@/components/data-client";

export default function ProfilePage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ actual: "", nueva: "", confirmar: "" });
  useEffect(() => {
    api<SessionUser>("/api/auth/me")
      .then(setUser)
      .catch((reason) => setError(errorText(reason)))
      .finally(() => setLoading(false));
  }, []);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (form.nueva !== form.confirmar) { setError("Las contraseñas nuevas no coinciden."); return; }
    setSaving(true);
    try {
      await api("/api/auth/password", { method: "PUT", body: JSON.stringify({ actual: form.actual, nueva: form.nueva }) });
      setSuccess("Tu contraseña se actualizó correctamente.");
      setForm({ actual: "", nueva: "", confirmar: "" });
    } catch (reason) { setError(errorText(reason)); }
    finally { setSaving(false); }
  }

  return (
    <div className="page-stack">
      <PageHeader eyebrow="PREFERENCIAS" title="Mi perfil" description="Consultá los datos de tu cuenta y actualizá tu contraseña." />
      {error && <ErrorBanner message={error} />}
      {success && <div className="success-banner" role="status"><ShieldCheck size={17} />{success}</div>}
      {loading ? <Loading /> : user && <div className="profile-grid">
        <Panel title="Datos de cuenta" detail="Información asociada a tu acceso">
          <div className="profile-card-top"><span className="profile-avatar">{user.nombre.slice(0, 1).toUpperCase()}</span><div><strong>{user.nombre}</strong><span>{user.rol === "admin" ? "Administrador" : "Vendedor"}</span></div></div>
          <div className="profile-info-row"><span><UserRound size={16} /> Nombre</span><strong>{user.nombre}</strong></div>
          <div className="profile-info-row"><span><Mail size={16} /> Correo</span><strong>{user.email}</strong></div>
          <div className="profile-info-row"><span><ShieldCheck size={16} /> Rol</span><strong>{user.rol === "admin" ? "Administrador" : "Vendedor"}</strong></div>
        </Panel>
        <Panel title="Cambiar contraseña" detail="Usá una contraseña única de al menos 8 caracteres.">
          <form className="form-grid password-form" onSubmit={changePassword}>
            <Field label="Contraseña actual"><TextInput required type="password" autoComplete="current-password" value={form.actual} onChange={(event) => setForm({ ...form, actual: event.target.value })} /></Field>
            <Field label="Nueva contraseña"><TextInput required type="password" minLength={8} autoComplete="new-password" value={form.nueva} onChange={(event) => setForm({ ...form, nueva: event.target.value })} /></Field>
            <Field label="Confirmar nueva contraseña"><TextInput required type="password" minLength={8} autoComplete="new-password" value={form.confirmar} onChange={(event) => setForm({ ...form, confirmar: event.target.value })} /></Field>
            <div className="password-tip"><KeyRound size={16} /><span>No compartas tu contraseña. El equipo de MotoParts &amp; Ruta 9 nunca te la solicitará.</span></div>
            <Button disabled={saving}>{saving ? "Actualizando..." : "Actualizar contraseña"}</Button>
          </form>
        </Panel>
      </div>}
    </div>
  );
}
