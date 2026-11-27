import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { actualizarUsuario } from "@/services/usuarios.service";

export const PATCH = withAuth<{ params: Promise<{ id: string }> }>(
  async (req, ctx, user) => {
    const { id } = await ctx.params;
    const body = await parseJsonBody(req);
    const updated = await actualizarUsuario(user, { id, cambios: body });
    return NextResponse.json({ data: updated });
  },
);
