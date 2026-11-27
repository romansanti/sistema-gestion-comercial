"use client";

import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api-client";

export default function PerfilForm() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function cambiarPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (nueva !== confirmacion) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }

    setSaving(true);
    try {
      await apiFetch<void>("/api/auth/password", {
        method: "PUT",
        body: JSON.stringify({ actual, nueva }),
      });
      setActual("");
      setNueva("");
      setConfirmacion("");
      setNotice("La contraseña se actualizó correctamente.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo actualizar la contraseña.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
          Cuenta
        </p>
        <h1 className="mt-1 text-3xl font-bold text-white">Mi perfil</h1>
        <p className="mt-1 text-sm text-slate-400">
          Actualizá tu contraseña de acceso.
        </p>
      </header>

      <form
        onSubmit={cambiarPassword}
        className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6"
      >
        {error && (
          <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-200">
            {notice}
          </p>
        )}
        <label className="block text-sm text-slate-300">
          Contraseña actual
          <input
            type="password"
            autoComplete="current-password"
            required
            value={actual}
            onChange={(event) => setActual(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
          />
        </label>
        <label className="block text-sm text-slate-300">
          Nueva contraseña
          <input
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={nueva}
            onChange={(event) => setNueva(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
          />
        </label>
        <label className="block text-sm text-slate-300">
          Confirmar nueva contraseña
          <input
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={confirmacion}
            onChange={(event) => setConfirmacion(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Cambiar contraseña"}
        </button>
      </form>
    </div>
  );
}
