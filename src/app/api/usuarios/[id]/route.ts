import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { ApiError } from "@/lib/errors";
import { exigirAdmin } from "@/lib/session";

const patchUsuarioSchema = z.object({ activo: z.boolean() }).strict();

export const PATCH = withAuth<{ params: Promise<{ id: string }> }>(
  async (req, ctx, user) => {
    await exigirAdmin();
    const { id } = await ctx.params;
    const targetId = Number(id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      throw new ApiError(400, "VALIDACION", "ID de usuario inválido.");
    }
    if (targetId === user.id) {
      throw new ApiError(
        409,
        "OPERACION_SOBRE_SI_MISMO",
        "No podés desactivar tu propio usuario.",
      );
    }

    const body = await parseJsonBody(req);
    const { activo } = patchUsuarioSchema.parse(body);
    const [updated] = await db
      .update(usuarios)
      .set({ activo })
      .where(eq(usuarios.id, targetId))
      .returning({
        id: usuarios.id,
        nombre: usuarios.nombre,
        email: usuarios.email,
        rol: usuarios.rol,
        activo: usuarios.activo,
        createdAt: usuarios.createdAt,
      });

    if (!updated) {
      throw new ApiError(404, "NO_ENCONTRADO", "Usuario no encontrado.");
    }

    return NextResponse.json({ data: updated });
  },
);
