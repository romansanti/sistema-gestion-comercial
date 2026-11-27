import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import {
  listarMovimientosProducto,
  registrarMovimientoStock,
} from "@/services/productos.service";

export const GET = withAuth<{ params: Promise<{ id: string }> }>(
  async (_req, ctx, user) => {
    const { id } = await ctx.params;
    const data = await listarMovimientosProducto(user, { productoId: id });
    return NextResponse.json({ data });
  },
);

export const POST = withAuth<{ params: Promise<{ id: string }> }>(
  async (req, ctx, user) => {
    const { id } = await ctx.params;
    const body = await parseJsonBody(req);
    const resultado = await registrarMovimientoStock(user, {
      productoId: id,
      cambios: body,
    });
    return NextResponse.json({ data: resultado }, { status: 201 });
  },
);
