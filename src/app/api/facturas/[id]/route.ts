import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-handler";
import { ApiError } from "@/lib/errors";
import { obtenerFacturaDetalle } from "@/services/facturas.service";

export const GET = withAuth<{ params: Promise<{ id: string }> }>(
  async (_req, ctx) => {
    const { id } = await ctx.params;
    const facturaId = Number(id);
    if (!Number.isInteger(facturaId) || facturaId <= 0) {
      throw new ApiError(400, "VALIDACION", "ID de factura inválido.");
    }

    const data = await obtenerFacturaDetalle(facturaId);
    return NextResponse.json({ data });
  },
);
