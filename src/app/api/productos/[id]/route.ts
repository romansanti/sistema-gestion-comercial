import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { ApiError } from "@/lib/errors";
import { actualizarProductoSchema } from "@/lib/schemas/productos";
import { exigirAdmin } from "@/lib/session";
import {
  actualizarProducto,
  obtenerProductoPorId,
} from "@/services/productos.service";

export const GET = withAuth<{ params: Promise<{ id: string }> }>(
  async (_req, ctx) => {
    const { id } = await ctx.params;
    const productoId = Number(id);
    if (!Number.isInteger(productoId) || productoId <= 0) {
      throw new ApiError(400, "VALIDACION", "ID de producto inválido.");
    }

    const producto = await obtenerProductoPorId(productoId);
    return NextResponse.json({ data: producto });
  },
);

export const PATCH = withAuth<{ params: Promise<{ id: string }> }>(
  async (req, ctx) => {
    await exigirAdmin();
    const { id } = await ctx.params;
    const productoId = Number(id);
    if (!Number.isInteger(productoId) || productoId <= 0) {
      throw new ApiError(400, "VALIDACION", "ID de producto inválido.");
    }

    const body = await parseJsonBody(req);
    const parsed = actualizarProductoSchema.parse(body);
    const actualizado = await actualizarProducto(productoId, parsed);
    return NextResponse.json({ data: actualizado });
  },
);
