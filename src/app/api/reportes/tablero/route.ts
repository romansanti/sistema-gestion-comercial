import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-handler";
import { obtenerResumenTablero } from "@/services/tablero.service";

export const GET = withAuth(async (_req, _ctx, user) => {
  const data = await obtenerResumenTablero(user, {});
  return NextResponse.json({ data });
});
