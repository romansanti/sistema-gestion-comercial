import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { ApiError } from "@/lib/errors";
import { actualizarCategoriaSchema } from "@/lib/schemas/productos";
import { exigirAdmin } from "@/lib/session";
import { actualizarCategoria } from "@/services/categorias.service";

export const PATCH = withAuth<{ params: Promise<{ id: string }> }>(
  async (req, ctx) => {
    await exigirAdmin();
    const { id } = await ctx.params;
    const categoriaId = Number(id);
    if (!Number.isInteger(categoriaId) || categoriaId <= 0) {
      throw new ApiError(400, "VALIDACION", "ID de categoría inválido.");
    }

    const body = await parseJsonBody(req);
    const parsed = actualizarCategoriaSchema.parse(body);
    const actualizada = await actualizarCategoria(categoriaId, parsed);
    return NextResponse.json({ data: actualizada });
  },
);
