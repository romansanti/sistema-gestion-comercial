"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AlertCircle, Plus, UserCheck, UserX } from "lucide-react";
import { useSession } from "@/components/session-provider";
import { Modal } from "@/components/ui/modal";
import { apiFetch } from "@/lib/api-client";

type User = {
  id: number;
  nombre: string;
  email: string;
  rol: "admin" | "vendedor";
  activo: boolean;
  createdAt: string;
};

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-amber-500";

export default function UsuariosClientPage() {
  const session = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    rol: "vendedor" as "admin" | "vendedor",
  });

  const refresh = useCallback(async () => {
    setUsers(await apiFetch<User[]>("/api/usuarios"));
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      refresh()
        .catch((cause: unknown) =>
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudo cargar el listado de usuarios.",
          ),
        )
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [refresh]);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiFetch<User>("/api/usuarios", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm({ nombre: "", email: "", password: "", rol: "vendedor" });
      setCreateOpen(false);
      setNotice("Usuario creado correctamente.");
      try {
        await refresh();
      } catch {
        setError("Usuario creado, pero no se pudo actualizar el listado.");
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo crear el usuario.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(user: User) {
    setError(null);
    setBusy(true);
    try {
      const updated = await apiFetch<User>(`/api/usuarios/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ activo: !user.activo }),
      });
      setUsers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setNotice(
        `${updated.nombre} ${updated.activo ? "activado" : "desactivado"}.`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo actualizar el usuario.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
            Administración
          </p>
          <h1 className="mt-1 text-3xl font-bold text-white">
            Usuarios y permisos
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Gestioná los accesos del equipo. Los usuarios inactivos pierden acceso en su próxima petición.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setCreateOpen(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400"
        >
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto text-xs underline"
          >
            Cerrar
          </button>
        </div>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
        >
          {notice}
        </p>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-800 p-5">
          <div>
            <h2 className="font-semibold text-white">Equipo</h2>
            <p className="mt-1 text-sm text-slate-400">
              {users.length} usuarios registrados
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-slate-950 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Rol</th>
                <th className="px-5 py-3">Acceso</th>
                <th className="px-5 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-5 py-4 font-medium text-white">{user.nombre}</td>
                  <td className="px-5 py-4 text-slate-300">{user.email}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        user.rol === "admin"
                          ? "bg-amber-500/15 text-amber-300"
                          : "bg-sky-500/15 text-sky-300"
                      }`}
                    >
                      {user.rol === "admin" ? "Administrador" : "Vendedor"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        user.activo
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {user.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => changeStatus(user)}
                      disabled={busy || user.id === session.id}
                      title={
                        user.id === session.id
                          ? "No podés desactivar tu propio usuario."
                          : undefined
                      }
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
                        user.activo
                          ? "border-red-500/30 text-red-300 hover:bg-red-500/10"
                          : "border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                      }`}
                    >
                      {user.activo ? (
                        <UserX className="h-3.5 w-3.5" />
                      ) : (
                        <UserCheck className="h-3.5 w-3.5" />
                      )}
                      {user.activo ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                    Cargando usuarios...
                  </td>
                </tr>
              )}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={createOpen}
        title="Crear usuario"
        onClose={() => setCreateOpen(false)}
        className="max-w-xl"
      >
        <form
          onSubmit={createUser}
          className="space-y-4"
        >
          <label className="block text-sm font-medium text-slate-300">
            Nombre
            <input
              required
              minLength={3}
              value={form.nombre}
              onChange={(event) => setForm({ ...form, nombre: event.target.value })}
              className={`${inputClass} mt-1.5`}
            />
          </label>
          <label className="block text-sm font-medium text-slate-300">
            Email
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className={`${inputClass} mt-1.5`}
            />
          </label>
          <label className="block text-sm font-medium text-slate-300">
            Contraseña inicial
            <input
              required
              type="password"
              minLength={6}
              autoComplete="new-password"
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
              className={`${inputClass} mt-1.5`}
            />
          </label>
          <label className="block text-sm font-medium text-slate-300">
            Rol
            <select
              value={form.rol}
              onChange={(event) =>
                setForm({ ...form, rol: event.target.value as "admin" | "vendedor" })
              }
              className={`${inputClass} mt-1.5`}
            >
              <option value="vendedor">Vendedor</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
            >
              {busy ? "Creando..." : "Crear usuario"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
