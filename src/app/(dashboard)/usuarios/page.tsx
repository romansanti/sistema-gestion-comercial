import { Suspense } from "react";
import { redirect } from "next/navigation";
import { obtenerUsuarioActual } from "@/lib/session";
import UsuariosView from "@/components/usuarios/usuarios-view";

async function AdminUsersPage() {
  const user = await obtenerUsuarioActual();
  if (!user || user.rol !== "admin") redirect("/ventas/nueva");
  return <UsuariosView />;
}

export default function UsuariosPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-sm text-slate-400">Cargando usuarios...</div>
      }
    >
      <AdminUsersPage />
    </Suspense>
  );
}
