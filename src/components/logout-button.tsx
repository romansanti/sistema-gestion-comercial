"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton({
  variant = "light",
}: {
  variant?: "light" | "dark";
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error("No se pudo cerrar la sesión. Intentá nuevamente.");
      }
      router.push("/login");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo cerrar la sesión.",
      );
      setLoading(false);
    }
  }

  return (
    <span className="relative">
      {error && (
        <span
          role="alert"
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-red-500/30 bg-slate-900 p-2 text-xs text-red-200 shadow-lg"
        >
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        aria-label="Cerrar sesión"
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition disabled:opacity-50 max-sm:px-2 ${
          variant === "dark"
            ? "border-slate-700 text-slate-300 hover:bg-slate-800"
            : "border-slate-700 text-slate-300 hover:bg-slate-800"
        }`}
      >
        <LogOut className="h-4 w-4" />
        <span className="max-sm:hidden">{loading ? "Saliendo..." : "Salir"}</span>
      </button>
    </span>
  );
}
