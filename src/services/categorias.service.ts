import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categorias, productos } from "@/db/schema";
import { ApiError } from "@/lib/errors";
import {
  actualizarCategoriaSchema,
  crearCategoriaSchema,
  listarCategoriasSchema,
} from "@/lib/schemas/categorias";
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

/** RF-C1: Lista las categorías disponibles para el catálogo. */
export async function listarCategorias(_usuario: UsuarioSesion, input: unknown) {
  const { activas } = listarCategoriasSchema.parse(input);
  if (activas) {
    return db
      .select()
      .from(categorias)
      .where(eq(categorias.activa, true))
      .orderBy(categorias.nombre);
  }
  return db.select().from(categorias).orderBy(categorias.nombre);
}

/** RF-C2: Crea una categoría con nombre único, solo para administradores. */
export async function crearCategoria(usuario: UsuarioSesion, input: unknown) {
  const data = crearCategoriaSchema.parse(input);
  exigirAdmin(usuario);

  const [existente] = await db
    .select({ id: categorias.id })
    .from(categorias)
    .where(sql`lower(${categorias.nombre}) = lower(${data.nombre})`)
    .limit(1);

  if (existente) {
    throw new ApiError(
      409,
      "NOMBRE_DUPLICADO",
      `Ya existe una categoría llamada "${data.nombre}".`,
    );
  }

  const [creada] = await db
    .insert(categorias)
    .values({ nombre: data.nombre, activa: true })
    .returning();

  return creada;
}

/** RF-C3: Actualiza categoría y evita desactivar las que tienen productos. */
export async function actualizarCategoria(
  usuario: UsuarioSesion,
  input: unknown,
) {
  const { id, cambios } = actualizarCategoriaSchema.parse(input);
  exigirAdmin(usuario);

  const [actual] = await db
    .select()
    .from(categorias)
    .where(eq(categorias.id, id))
    .limit(1);

  if (!actual) {
    throw new ApiError(404, "NO_ENCONTRADO", "Categoría no encontrada.");
  }

  if (
    cambios.nombre &&
    cambios.nombre.toLowerCase() !== actual.nombre.toLowerCase()
  ) {
    const [duplicada] = await db
      .select({ id: categorias.id })
      .from(categorias)
      .where(sql`lower(${categorias.nombre}) = lower(${cambios.nombre})`)
      .limit(1);

    if (duplicada) {
      throw new ApiError(
        409,
        "NOMBRE_DUPLICADO",
        `Ya existe una categoría llamada "${cambios.nombre}".`,
      );
    }
  }

  if (cambios.activa === false) {
    const [enUso] = await db
      .select({ id: productos.id })
      .from(productos)
      .where(eq(productos.categoriaId, id))
      .limit(1);

    if (enUso) {
      throw new ApiError(
        409,
        "CATEGORIA_EN_USO",
        "No se puede desactivar una categoría que tiene productos asociados.",
      );
    }
  }

  const [actualizada] = await db
    .update(categorias)
    .set(cambios)
    .where(eq(categorias.id, id))
    .returning();

  return actualizada;
}
