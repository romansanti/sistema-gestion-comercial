"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, LockKeyhole, Mail, Wrench } from "lucide-react";

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
      router.push("/inicio");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-[#fafaf8]">
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#12232c] p-12 text-white md:flex xl:p-14">
        <div className="pointer-events-none absolute -right-36 top-24 h-80 w-80 rounded-full bg-[#1d3943]" />
        <div className="pointer-events-none absolute -bottom-48 right-[-6rem] h-[34rem] w-[34rem] rounded-full border-[4rem] border-[#1d3943]" />
        <div className="relative z-10 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#5ac9c5] text-[#12232c]">
            <Wrench className="h-6 w-6" />
          </span>
          <span>
            <span className="block text-lg font-bold">Repuestos</span>
            <span className="text-sm text-[#9daeb4]">Motos y Autos</span>
          </span>
        </div>
        <div className="relative z-10 max-w-xl">
          <h2 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Facturá, controlá el stock y llevá las cuentas corrientes desde el mostrador.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-[#aebbc0]">
            Cada venta actualiza las existencias en el mismo acto y deja su
            movimiento registrado.
          </p>
        </div>
        <p className="relative z-10 text-sm text-[#9daeb4]">
          San Miguel de Tucumán · Gestión comercial de repuestos
        </p>
      </section>

      <section className="flex min-h-screen flex-1 items-center justify-center px-6 py-10 md:px-12">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 md:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5ac9c5] text-[#12232c]">
              <Wrench className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-bold text-slate-900">Repuestos</span>
              <span className="text-xs text-slate-500">Motos y Autos</span>
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Iniciar sesión
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Ingresá con tu email y contraseña.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block text-sm font-medium text-slate-800">
              Email
              <span className="relative mt-2 block">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="usuario@repuestos.com"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#08747e] focus:ring-2 focus:ring-[#08747e]/15"
                />
              </span>
            </label>

            <label className="block text-sm font-medium text-slate-800">
              Contraseña
              <span className="relative mt-2 block">
                <LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Contraseña"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#08747e] focus:ring-2 focus:ring-[#08747e]/15"
                />
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#08747e] py-3 text-sm font-semibold text-white transition hover:bg-[#07626b] disabled:opacity-50"
            >
              {loading ? "Ingresando..." : "Ingresar"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
