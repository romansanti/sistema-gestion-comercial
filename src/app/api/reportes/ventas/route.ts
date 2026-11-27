import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-handler";
import { obtenerReporteVentas } from "@/services/reportes.service";

export const GET = withAuth(async (req, _ctx, user) => {
  const data = await obtenerReporteVentas(user, {
    desde: req.nextUrl.searchParams.get("desde") ?? undefined,
    hasta: req.nextUrl.searchParams.get("hasta") ?? undefined,
  });
  return NextResponse.json({ data });
});
