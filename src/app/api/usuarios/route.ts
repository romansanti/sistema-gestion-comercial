import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { ApiError } from "@/lib/errors";
import { exigirAdmin } from "@/lib/session";

const crearUsuarioSchema = z
  .object({
    nombre: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres."),
    email: z.string().trim().email("Email inválido.").toLowerCase(),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
    rol: z.enum(["admin", "vendedor"]),
  })
  .strict();

export const GET = withAuth(async () => {
  await exigirAdmin();
  const data = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      email: usuarios.email,
      rol: usuarios.rol,
      activo: usuarios.activo,
      createdAt: usuarios.createdAt,
    })
    .from(usuarios)
    .orderBy(asc(usuarios.nombre));

  return NextResponse.json({ data });
});

export const POST = withAuth(async (req) => {
  await exigirAdmin();
  const body = await parseJsonBody(req);
  const parsed = crearUsuarioSchema.parse(body);

  const [existing] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.email, parsed.email))
    .limit(1);

  if (existing) {
    throw new ApiError(
      409,
      "EMAIL_DUPLICADO",
      "Ya existe un usuario con ese email.",
    );
  }

  const passwordHash = await bcrypt.hash(parsed.password, 10);
  const [created] = await db
    .insert(usuarios)
    .values({
      nombre: parsed.nombre,
      email: parsed.email,
      passwordHash,
      rol: parsed.rol,
      activo: true,
    })
    .returning({
      id: usuarios.id,
      nombre: usuarios.nombre,
      email: usuarios.email,
      rol: usuarios.rol,
      activo: usuarios.activo,
      createdAt: usuarios.createdAt,
    });

  return NextResponse.json({ data: created }, { status: 201 });
});
