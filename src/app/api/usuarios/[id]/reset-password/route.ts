import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { restablecerPasswordUsuario } from "@/services/usuarios.service";

export const POST = withAuth<{ params: Promise<{ id: string }> }>(
  async (req, ctx, user) => {
    const { id } = await ctx.params;
    const body = await parseJsonBody(req);
    const data = await restablecerPasswordUsuario(user, {
      id,
      ...(typeof body === "object" && body !== null && !Array.isArray(body)
        ? body
        : { password: undefined }),
    });
    return NextResponse.json({ data });
  },
);
