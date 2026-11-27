"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Lock, Mail, Wrench } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result?.error?.message || "Credenciales inválidas.");
        setLoading(false);
        return;
      }
      router.push("/ventas/nueva");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
      setLoading(false);
    }
  }

  function fillCredentials(role: "admin" | "vendedor") {
    setEmail(role === "admin" ? "admin@repuestos.com" : "vendedor@repuestos.com");
    setPassword("123456");
    setError(null);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/15 p-3 text-amber-400">
            <Wrench className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">
              Repuestos Motos &amp; Autos
            </h1>
            <p className="text-sm text-slate-400">
              Gestión Comercial y Mostrador
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-300">
            Correo electrónico
            <span className="relative mt-1.5 block">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="usuario@repuestos.com"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </span>
          </label>

          <label className="block text-sm font-medium text-slate-300">
            Contraseña
            <span className="relative mt-1.5 block">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Contraseña"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-800 pt-5">
          <p className="mb-2.5 text-center text-xs text-slate-400">
            Accesos de prueba (clave: 123456)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials("admin")}
              className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs text-slate-200 transition hover:bg-slate-800"
            >
              Encargado (Admin)
            </button>
            <button
              type="button"
              onClick={() => fillCredentials("vendedor")}
              className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs text-slate-200 transition hover:bg-slate-800"
            >
              Mostrador (Vendedor)
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
