import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-handler";
import { listarMovimientosStock } from "@/services/productos.service";

export const GET = withAuth(async (req, _ctx, user) => {
  const search = req.nextUrl.searchParams;
  const result = await listarMovimientosStock(user, {
    productoId: search.get("productoId") ?? undefined,
    tipo: search.get("tipo") ?? undefined,
    desde: search.get("desde") ?? undefined,
    hasta: search.get("hasta") ?? undefined,
    page: search.get("page") ?? undefined,
    pageSize: search.get("pageSize") ?? undefined,
  });
  return NextResponse.json({ data: result.items, pagination: result.pagination });
});
