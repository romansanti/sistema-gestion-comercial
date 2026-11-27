import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-handler";
import { obtenerPagoDetalle } from "@/services/pagos.service";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withAuth<RouteContext>(async (_req, ctx, user) => {
  const { id } = await ctx.params;
  const data = await obtenerPagoDetalle(user, { id });
  return NextResponse.json({ data });
});
