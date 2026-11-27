"use client";

import { KeyRound, Plus, Shield, UserRound, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Button, EmptyState, ErrorBanner, Field, Loading, PageHeader, Panel, SelectInput, StatusPill, TextInput } from "@/components/app-ui";
import { api, errorText, formatDate, type SessionUser } from "@/components/data-client";
import { notifyToast } from "@/components/toast";

type UserRow = SessionUser & { activo: boolean; createdAt: string };

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [session, setSession] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ nombre: "", email: "", rol: "vendedor", password: "" });

  useEffect(() => {
    let active = true;
    Promise.all([api<UserRow[]>("/api/usuarios"), api<SessionUser>("/api/auth/me")])
      .then(([rows, me]) => {
        if (!active) return;
        setUsers(rows);
        setSession(me);
        setError("");
      })
      .catch((reason) => { if (active) setError(errorText(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refresh]);

  function openForm(user?: UserRow) {
    setEditing(user ?? null);
    setForm(user ? { nombre: user.nombre, email: user.email, rol: user.rol, password: "" } : { nombre: "", email: "", rol: "vendedor", password: "" });
    setShowForm(true);
  }
  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const body = editing
      ? { nombre: form.nombre.trim(), email: form.email.trim(), rol: form.rol }
      : { nombre: form.nombre.trim(), email: form.email.trim(), password: form.password, rol: form.rol };
    try {
      await api(editing ? `/api/usuarios/${editing.id}` : "/api/usuarios", { method: editing ? "PUT" : "POST", body: JSON.stringify(body) });
      setShowForm(false);
      notifyToast(editing ? "Usuario actualizado." : "Usuario creado.");
      setRefresh((value) => value + 1);
    } catch (reason) { const message = errorText(reason); setError(message); notifyToast(message, "error"); }
    finally { setSaving(false); }
  }
  async function toggleUser(user: UserRow) {
    try {
      await api(`/api/usuarios/${user.id}/estado`, { method: "PATCH", body: JSON.stringify({ activo: !user.activo }) });
      setRefresh((value) => value + 1);
    } catch (reason) { const message = errorText(reason); setError(message); notifyToast(message, "error"); }
  }
  async function resetPassword(user: UserRow) {
    const password = window.prompt(`Ingresá la nueva contraseña temporal para ${user.nombre} (mínimo 8 caracteres):`);
    if (!password) return;
    try {
      const result = await api<{ passwordTemporal: string }>(`/api/usuarios/${user.id}/reset-password`, { method: "POST", body: JSON.stringify({ password }) });
      notifyToast(`Contraseña actualizada para ${user.email}. Contraseña temporal: ${result.passwordTemporal}`);
    } catch (reason) { const message = errorText(reason); setError(message); notifyToast(message, "error"); }
  }

  return (
    <div className="page-stack">
      <PageHeader eyebrow="ADMINISTRACIÓN" title="Usuarios" description="Administrá el acceso al sistema y los roles del equipo." action={<Button onClick={() => openForm()}><Plus size={17} /> Nuevo usuario</Button>} />
      {error && <ErrorBanner message={error} />}
      <div className="user-overview">
        <div className="user-overview-icon"><UserRound size={20} /></div><div><strong>{users.length} usuarios</strong><span>{users.filter((user) => user.activo).length} con acceso activo</span></div>
        <div className="user-overview-note"><Shield size={16} /> Sólo administradores pueden gestionar usuarios.</div>
      </div>
      <Panel className="table-panel">
        {loading ? <Loading label="Cargando usuarios..." /> : users.length === 0 ? <EmptyState title="No se encontraron usuarios" /> : <div className="table-scroll"><table><thead><tr><th>Usuario</th><th>Rol</th><th>Alta</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{users.map((user) => <tr key={user.id}>
          <td><div className="user-cell"><span className={`avatar ${user.rol === "admin" ? "avatar-admin" : ""}`}>{user.nombre.slice(0, 1).toUpperCase()}</span><span><strong className="table-primary">{user.nombre}{user.id === session?.id && <small className="you-tag">Vos</small>}</strong><small className="table-secondary">{user.email}</small></span></div></td>
          <td><span className={`role-tag ${user.rol === "admin" ? "role-admin" : "role-seller"}`}>{user.rol === "admin" ? "Administrador" : "Vendedor"}</span></td><td>{formatDate(user.createdAt)}</td><td><StatusPill active={user.activo}>{user.activo ? "Activo" : "Inactivo"}</StatusPill></td>
          <td><div className="row-actions"><Button size="small" variant="quiet" onClick={() => openForm(user)}>Editar</Button><Button size="small" variant="quiet" title="Restablecer contraseña" onClick={() => void resetPassword(user)}><KeyRound size={15} /></Button>{user.id !== session?.id && <Button size="small" variant="quiet" onClick={() => void toggleUser(user)}>{user.activo ? "Desactivar" : "Activar"}</Button>}</div></td>
        </tr>)}</tbody></table></div>}
      </Panel>
      {showForm && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}><div className="modal-card modal-card-narrow" role="dialog" aria-modal="true" aria-labelledby="user-modal-title"><div className="modal-heading"><div><span className="eyebrow">ACCESO AL SISTEMA</span><h2 id="user-modal-title">{editing ? "Editar usuario" : "Nuevo usuario"}</h2></div><button type="button" className="icon-button" aria-label="Cerrar" onClick={() => setShowForm(false)}><X size={19} /></button></div><form className="form-grid" onSubmit={saveUser}><Field label="Nombre completo"><TextInput required minLength={2} maxLength={120} value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} /></Field><Field label="Correo electrónico"><TextInput required type="email" maxLength={254} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field><Field label="Rol"><SelectInput value={form.rol} onChange={(event) => setForm({ ...form, rol: event.target.value })}><option value="vendedor">Vendedor</option><option value="admin">Administrador</option></SelectInput></Field>{!editing && <Field label="Contraseña inicial" hint="Debe tener al menos 8 caracteres."><TextInput required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></Field>}<div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button><Button disabled={saving}>{saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear usuario"}</Button></div></form></div></div>}
    </div>
  );
}
