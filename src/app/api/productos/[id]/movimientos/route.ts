import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { ApiError } from "@/lib/errors";
import { movimientoStockSchema } from "@/lib/schemas/productos";
import { exigirAdmin } from "@/lib/session";
import { registrarMovimientoStock } from "@/services/productos.service";

export const POST = withAuth<{ params: Promise<{ id: string }> }>(
  async (req, ctx, user) => {
    await exigirAdmin();
    const { id } = await ctx.params;
    const productoId = Number(id);
    if (!Number.isInteger(productoId) || productoId <= 0) {
      throw new ApiError(400, "VALIDACION", "ID de producto inválido.");
    }

    const body = await parseJsonBody(req);
    const parsed = movimientoStockSchema.parse(body);
    const resultado = await registrarMovimientoStock(
      productoId,
      parsed,
      user.id,
    );
    return NextResponse.json({ data: resultado }, { status: 201 });
  },
);
