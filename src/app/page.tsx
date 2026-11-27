import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import TableroView from "@/components/tablero/tablero-view";
import { obtenerUsuarioActual } from "@/lib/session";

export default async function HomePage() {
  const user = await obtenerUsuarioActual();
  if (!user) redirect("/login");
  return (
    <AppShell user={user}>
      <TableroView />
    </AppShell>
  );
}
