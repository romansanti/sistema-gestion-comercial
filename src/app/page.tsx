import { redirect } from "next/navigation";
import { Suspense } from "react";
import { obtenerUsuarioActual } from "@/lib/session";

async function RedirectHome() {
  const user = await obtenerUsuarioActual();
  redirect(user ? "/ventas/nueva" : "/login");
  return null;
}

export default function HomePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-950" />}>
      <RedirectHome />
    </Suspense>
  );
}
