import bcrypt from "bcryptjs";
import { and, asc, count, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { ApiError } from "@/lib/errors";
import {
  actualizarUsuarioSchema,
  crearUsuarioSchema,
  listarUsuariosSchema,
  restablecerPasswordUsuarioSchema,
} from "@/lib/schemas/usuarios";
import type { UsuarioSesion } from "@/lib/session";

function exigirAdmin(usuario: UsuarioSesion): void {
  if (usuario.rol !== "admin") {
    throw new ApiError(
      403,
      "SIN_PERMISO",
      "Esta acción requiere permisos de administrador.",
    );
  }
}

/** RF-U6: Lista usuarios activos e inactivos con paginación, solo para administradores. */
export async function listarUsuarios(usuario: UsuarioSesion, input: unknown) {
  const filtros = listarUsuariosSchema.parse(input);
  exigirAdmin(usuario);

  const offset = (filtros.page - 1) * filtros.pageSize;
  const [totalRow] = await db.select({ total: count() }).from(usuarios);
  const items = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      email: usuarios.email,
      rol: usuarios.rol,
      activo: usuarios.activo,
      createdAt: usuarios.createdAt,
    })
    .from(usuarios)
    .orderBy(asc(usuarios.nombre))
    .limit(filtros.pageSize)
    .offset(offset);

  const total = Number(totalRow?.total ?? 0);
  return {
    items,
    pagination: {
      page: filtros.page,
      pageSize: filtros.pageSize,
      total,
      totalPages: Math.ceil(total / filtros.pageSize),
    },
  };
}

/** RF-U7: Crea un usuario con contraseña hasheada, solo para administradores. */
export async function crearUsuario(usuario: UsuarioSesion, input: unknown) {
  const data = crearUsuarioSchema.parse(input);
  exigirAdmin(usuario);

  const [existing] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.email, data.email))
    .limit(1);

  if (existing) {
    throw new ApiError(409, "EMAIL_DUPLICADO", "Ya existe un usuario con ese email.");
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const [created] = await db
    .insert(usuarios)
    .values({
      nombre: data.nombre,
      email: data.email,
      passwordHash,
      rol: data.rol,
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

  return created;
}

/** RF-U8: Actualiza datos o estado lógico del usuario y protege la cuenta propia. */
export async function actualizarUsuario(usuario: UsuarioSesion, input: unknown) {
  const { id, cambios } = actualizarUsuarioSchema.parse(input);
  exigirAdmin(usuario);

  if (
    id === usuario.id &&
    (cambios.activo === false || (cambios.rol && cambios.rol !== usuario.rol))
  ) {
    throw new ApiError(
      422,
      "OPERACION_SOBRE_SI_MISMO",
      "No podés desactivar ni cambiar el rol de tu propio usuario.",
    );
  }

  if (cambios.email) {
    const [existing] = await db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(and(eq(usuarios.email, cambios.email), ne(usuarios.id, id)))
      .limit(1);

    if (existing) {
      throw new ApiError(409, "EMAIL_DUPLICADO", "Ya existe un usuario con ese email.");
    }
  }

  const [updated] = await db
    .update(usuarios)
    .set(cambios)
    .where(eq(usuarios.id, id))
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

  return updated;
}

/** RF-U9: Restablece la contraseña de otro usuario, solo para administradores. */
export async function restablecerPasswordUsuario(
  usuario: UsuarioSesion,
  input: unknown,
) {
  const { id, password } = restablecerPasswordUsuarioSchema.parse(input);
  exigirAdmin(usuario);

  if (id === usuario.id) {
    throw new ApiError(
      422,
      "OPERACION_SOBRE_SI_MISMO",
      "Usá el cambio de contraseña de tu perfil para modificar tu contraseña.",
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [updated] = await db
    .update(usuarios)
    .set({ passwordHash })
    .where(eq(usuarios.id, id))
    .returning({ id: usuarios.id });

  if (!updated) {
    throw new ApiError(404, "NO_ENCONTRADO", "Usuario no encontrado.");
  }

  return { id: updated.id };
}
