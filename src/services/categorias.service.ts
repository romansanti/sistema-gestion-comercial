import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categorias, productos } from "@/db/schema";
import { ApiError } from "@/lib/errors";

export async function listarCategorias(soloActivas = false) {
  if (soloActivas) {
    return db
      .select()
      .from(categorias)
      .where(eq(categorias.activa, true))
      .orderBy(categorias.nombre);
  }
  return db.select().from(categorias).orderBy(categorias.nombre);
}

export async function crearCategoria(nombre: string) {
  const [existente] = await db
    .select({ id: categorias.id })
    .from(categorias)
    .where(sql`lower(${categorias.nombre}) = lower(${nombre})`)
    .limit(1);

  if (existente) {
    throw new ApiError(
      409,
      "NOMBRE_DUPLICADO",
      `Ya existe una categoría llamada "${nombre}".`,
    );
  }

  const [creada] = await db
    .insert(categorias)
    .values({ nombre, activa: true })
    .returning();

  return creada;
}

export async function actualizarCategoria(
  id: number,
  data: { nombre?: string; activa?: boolean },
) {
  const [actual] = await db
    .select()
    .from(categorias)
    .where(eq(categorias.id, id))
    .limit(1);

  if (!actual) {
    throw new ApiError(404, "NO_ENCONTRADO", "Categoría no encontrada.");
  }

  if (data.nombre && data.nombre.toLowerCase() !== actual.nombre.toLowerCase()) {
    const [duplicada] = await db
      .select({ id: categorias.id })
      .from(categorias)
      .where(sql`lower(${categorias.nombre}) = lower(${data.nombre})`)
      .limit(1);

    if (duplicada) {
      throw new ApiError(
        409,
        "NOMBRE_DUPLICADO",
        `Ya existe una categoría llamada "${data.nombre}".`,
      );
    }
  }

  if (data.activa === false) {
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
    .set({
      ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
      ...(data.activa !== undefined ? { activa: data.activa } : {}),
    })
    .where(eq(categorias.id, id))
    .returning();

  return actualizada;
}
