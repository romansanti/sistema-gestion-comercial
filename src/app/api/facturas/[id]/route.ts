import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-handler";
import { obtenerFacturaDetalle } from "@/services/facturas.service";

export const GET = withAuth<{ params: Promise<{ id: string }> }>(
  async (_req, ctx, user) => {
    const { id } = await ctx.params;
    const data = await obtenerFacturaDetalle(user, { id });
    return NextResponse.json({ data });
  },
);
