import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { actualizarCategoria } from "@/services/categorias.service";

export const PATCH = withAuth<{ params: Promise<{ id: string }> }>(
  async (req, ctx, user) => {
    const { id } = await ctx.params;
    const body = await parseJsonBody(req);
    const actualizada = await actualizarCategoria(user, { id, cambios: body });
    return NextResponse.json({ data: actualizada });
  },
);
