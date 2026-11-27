import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import {
  actualizarProducto,
  obtenerProductoPorId,
} from "@/services/productos.service";

export const GET = withAuth<{ params: Promise<{ id: string }> }>(
  async (_req, ctx, user) => {
    const { id } = await ctx.params;
    const producto = await obtenerProductoPorId(user, { id });
    return NextResponse.json({ data: producto });
  },
);

export const PATCH = withAuth<{ params: Promise<{ id: string }> }>(
  async (req, ctx, user) => {
    const { id } = await ctx.params;
    const body = await parseJsonBody(req);
    const actualizado = await actualizarProducto(user, { id, cambios: body });
    return NextResponse.json({ data: actualizado });
  },
);
