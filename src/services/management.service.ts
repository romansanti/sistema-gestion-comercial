import bcrypt from "bcryptjs";
import { and, asc, desc, eq, like, lte, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  categorias,
  movimientosStock,
  productos,
  usuarios,
} from "@/db/schema";
import { ApiError } from "@/lib/errors";
import { ahoraIsoUtc } from "@/lib/format";
import {
  categoriaSchema,
  estadoSchema,
  movimientoStockSchema,
  productoSchema,
  usuarioActualizarSchema,
  usuarioCrearSchema,
} from "@/lib/schemas/operations";
import type { UsuarioSesion } from "@/lib/session";
import { errorDuplicado, exigirAdmin, validarId } from "./common.service";

export async function listarUsuarios(user: UsuarioSesion) {
  exigirAdmin(user);
  return db
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
}

export async function crearUsuario(user: UsuarioSesion, input: unknown) {
  exigirAdmin(user);
  const data = usuarioCrearSchema.parse(input);
  try {
    const [created] = await db
      .insert(usuarios)
      .values({
        nombre: data.nombre,
        email: data.email.toLowerCase(),
        passwordHash: await bcrypt.hash(data.password, 10),
        rol: data.rol,
      })
      .returning({
        id: usuarios.id,
        nombre: usuarios.nombre,
        email: usuarios.email,
        rol: usuarios.rol,
        activo: usuarios.activo,
      });
    return created;
  } catch (error) {
    return errorDuplicado(error, "email");
  }
}

export async function actualizarUsuario(
  user: UsuarioSesion,
  idRaw: string,
  input: unknown,
) {
  exigirAdmin(user);
  const id = validarId(idRaw);
  const data = usuarioActualizarSchema.parse(input);
  try {
    const [updated] = await db
      .update(usuarios)
      .set({ ...data, email: data.email.toLowerCase() })
      .where(eq(usuarios.id, id))
      .returning({
        id: usuarios.id,
        nombre: usuarios.nombre,
        email: usuarios.email,
        rol: usuarios.rol,
        activo: usuarios.activo,
      });
    if (!updated) throw new ApiError(404, "NO_ENCONTRADO", "Usuario no encontrado.");
    return updated;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    return errorDuplicado(error, "email");
  }
}

export async function cambiarEstadoUsuario(
  user: UsuarioSesion,
  idRaw: string,
  input: unknown,
) {
  exigirAdmin(user);
  const id = validarId(idRaw);
  const { activo } = estadoSchema.parse(input);
  if (id === user.id && !activo) {
    throw new ApiError(422, "OPERACION_SOBRE_SI_MISMO", "No podés desactivar tu propio usuario.");
  }
  const [updated] = await db
    .update(usuarios)
    .set({ activo })
    .where(eq(usuarios.id, id))
    .returning({ id: usuarios.id, activo: usuarios.activo });
  if (!updated) throw new ApiError(404, "NO_ENCONTRADO", "Usuario no encontrado.");
  return updated;
}

export async function restablecerPasswordUsuario(
  user: UsuarioSesion,
  idRaw: string,
  input: unknown,
) {
  exigirAdmin(user);
  const id = validarId(idRaw);
  const data =
    input === undefined
      ? { password: `${crypto.randomUUID()}aA1!` }
      : zPassword.parse(input);
  const [updated] = await db
    .update(usuarios)
    .set({ passwordHash: await bcrypt.hash(data.password, 10) })
    .where(eq(usuarios.id, id))
    .returning({ id: usuarios.id, email: usuarios.email });
  if (!updated) throw new ApiError(404, "NO_ENCONTRADO", "Usuario no encontrado.");
  return { ...updated, passwordTemporal: data.password };
}

const zPassword = z.object({
  password: z.string().min(8).max(128),
}).strict();

export async function listarCategorias() {
  return db.select().from(categorias).orderBy(asc(categorias.nombre));
}

export async function crearCategoria(user: UsuarioSesion, input: unknown) {
  exigirAdmin(user);
  const data = categoriaSchema.parse(input);
  try {
    const [created] = await db.insert(categorias).values(data).returning();
    return created;
  } catch (error) {
    return errorDuplicado(error, "nombre");
  }
}

export async function actualizarCategoria(user: UsuarioSesion, idRaw: string, input: unknown) {
  exigirAdmin(user);
  const id = validarId(idRaw);
  const data = categoriaSchema.parse(input);
  try {
    const [updated] = await db
      .update(categorias)
      .set(data)
      .where(eq(categorias.id, id))
      .returning();
    if (!updated) throw new ApiError(404, "NO_ENCONTRADO", "Categoría no encontrada.");
    return updated;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    return errorDuplicado(error, "nombre");
  }
}

export async function cambiarEstadoCategoria(user: UsuarioSesion, idRaw: string, input: unknown) {
  exigirAdmin(user);
  const id = validarId(idRaw);
  const { activo } = estadoSchema.parse(input);
  return db.transaction(async (tx) => {
    if (!activo) {
      const [activeProduct] = await tx
        .select({ id: productos.id })
        .from(productos)
        .where(and(eq(productos.categoriaId, id), eq(productos.activo, true)))
        .limit(1);
      if (activeProduct) {
        throw new ApiError(409, "CATEGORIA_EN_USO", "No se puede desactivar una categoría con productos activos.");
      }
    }
    const [updated] = await tx
      .update(categorias)
      .set({ activa: activo })
      .where(eq(categorias.id, id))
      .returning({ id: categorias.id, activa: categorias.activa });
    if (!updated) throw new ApiError(404, "NO_ENCONTRADO", "Categoría no encontrada.");
    return updated;
  });
}

export async function listarProductos(filters: {
  q?: string | null;
  categoriaId?: string | null;
  bajoMinimo?: string | null;
  estado?: string | null;
}) {
  const conditions = [];
  if (filters.q?.trim()) {
    const q = `%${filters.q.trim()}%`;
    conditions.push(or(like(productos.codigo, q), like(productos.descripcion, q))!);
  }
  if (filters.categoriaId) {
    const categoriaId = Number(filters.categoriaId);
    if (Number.isSafeInteger(categoriaId) && categoriaId > 0) {
      conditions.push(eq(productos.categoriaId, categoriaId));
    }
  }
  if (filters.bajoMinimo === "true") {
    conditions.push(lte(productos.existencia, productos.stockMinimo));
  }
  if (filters.estado === "activos") conditions.push(eq(productos.activo, true));
  if (filters.estado === "inactivos") conditions.push(eq(productos.activo, false));
  return db
    .select({
      id: productos.id,
      codigo: productos.codigo,
      descripcion: productos.descripcion,
      categoriaId: productos.categoriaId,
      categoria: categorias.nombre,
      precio: productos.precio,
      existencia: productos.existencia,
      stockMinimo: productos.stockMinimo,
      activo: productos.activo,
      createdAt: productos.createdAt,
    })
    .from(productos)
    .innerJoin(categorias, eq(productos.categoriaId, categorias.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(productos.descripcion));
}

export async function obtenerProducto(idRaw: string) {
  const id = validarId(idRaw);
  const [product] = await db
    .select({
      id: productos.id,
      codigo: productos.codigo,
      descripcion: productos.descripcion,
      categoriaId: productos.categoriaId,
      categoria: categorias.nombre,
      precio: productos.precio,
      existencia: productos.existencia,
      stockMinimo: productos.stockMinimo,
      activo: productos.activo,
      createdAt: productos.createdAt,
    })
    .from(productos)
    .innerJoin(categorias, eq(productos.categoriaId, categorias.id))
    .where(eq(productos.id, id))
    .limit(1);
  if (!product) throw new ApiError(404, "NO_ENCONTRADO", "Producto no encontrado.");
  return product;
}

export async function guardarProducto(user: UsuarioSesion, input: unknown, idRaw?: string) {
  exigirAdmin(user);
  const data = productoSchema.parse(input);
  const values = {
    codigo: data.codigo.toUpperCase(),
    descripcion: data.descripcion,
    categoriaId: data.categoriaId,
    precio: data.precio,
    stockMinimo: data.stockMinimo,
  };
  try {
    if (idRaw) {
      const id = validarId(idRaw);
      const [category] = await db.select({ activa: categorias.activa })
        .from(categorias).where(eq(categorias.id, data.categoriaId)).limit(1);
      if (!category || !category.activa) {
        throw new ApiError(422, "VALIDACION", "La categoría seleccionada no existe o está inactiva.");
      }
      const [updated] = await db.update(productos).set(values)
        .where(eq(productos.id, id)).returning();
      if (!updated) throw new ApiError(404, "NO_ENCONTRADO", "Producto no encontrado.");
      return updated;
    }
    return await db.transaction(async (tx) => {
      const [category] = await tx.select({ activa: categorias.activa })
        .from(categorias).where(eq(categorias.id, data.categoriaId)).limit(1);
      if (!category || !category.activa) {
        throw new ApiError(422, "VALIDACION", "La categoría seleccionada no existe o está inactiva.");
      }
      const [created] = await tx.insert(productos).values({
        ...values,
        existencia: data.existencia ?? 0,
      }).returning();
      if (created.existencia > 0) {
        await tx.insert(movimientosStock).values({
          productoId: created.id,
          tipo: "ingreso",
          cantidad: created.existencia,
          existenciaResultante: created.existencia,
          motivo: "Stock inicial",
          usuarioId: user.id,
          fecha: ahoraIsoUtc(),
        });
      }
      return created;
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    return errorDuplicado(error, "codigo");
  }
}

export async function cambiarEstadoProducto(user: UsuarioSesion, idRaw: string, input: unknown) {
  exigirAdmin(user);
  const id = validarId(idRaw);
  const { activo } = estadoSchema.parse(input);
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(productos)
      .set({ activo })
      .where(eq(productos.id, id))
      .returning({ id: productos.id, activo: productos.activo });
    if (!updated) throw new ApiError(404, "NO_ENCONTRADO", "Producto no encontrado.");
    return updated;
  });
}

export async function listarMovimientosStock(filters: {
  productoId?: number;
  limit?: number;
}) {
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500);
  return db
    .select({
      id: movimientosStock.id,
      productoId: movimientosStock.productoId,
      codigo: productos.codigo,
      producto: productos.descripcion,
      tipo: movimientosStock.tipo,
      cantidad: movimientosStock.cantidad,
      existenciaResultante: movimientosStock.existenciaResultante,
      motivo: movimientosStock.motivo,
      observacion: movimientosStock.observacion,
      facturaId: movimientosStock.facturaId,
      usuarioId: movimientosStock.usuarioId,
      usuario: usuarios.nombre,
      fecha: movimientosStock.fecha,
    })
    .from(movimientosStock)
    .innerJoin(productos, eq(movimientosStock.productoId, productos.id))
    .innerJoin(usuarios, eq(movimientosStock.usuarioId, usuarios.id))
    .where(filters.productoId ? eq(movimientosStock.productoId, filters.productoId) : undefined)
    .orderBy(desc(movimientosStock.fecha), desc(movimientosStock.id))
    .limit(limit);
}

export async function crearMovimientoStock(
  user: UsuarioSesion,
  productIdRaw: string,
  input: unknown,
) {
  const productId = validarId(productIdRaw);
  const data = movimientoStockSchema.parse(input);
  return db.transaction(async (tx) => {
    const [product] = await tx.select().from(productos)
      .where(eq(productos.id, productId)).limit(1);
    if (!product) throw new ApiError(404, "NO_ENCONTRADO", "Producto no encontrado.");
    if (!product.activo) throw new ApiError(409, "PRODUCTO_INACTIVO", "No se puede modificar el stock de un producto inactivo.");
    const cantidad = data.tipo === "ingreso" ? data.cantidad : -data.cantidad;
    const existencia = product.existencia + cantidad;
    if (existencia < 0) throw new ApiError(409, "STOCK_INSUFICIENTE", "La existencia no alcanza para realizar el egreso.");
    await tx.update(productos).set({ existencia }).where(eq(productos.id, productId));
    const [movement] = await tx.insert(movimientosStock).values({
      productoId: productId,
      tipo: data.tipo,
      cantidad,
      existenciaResultante: existencia,
      motivo: data.motivo,
      observacion: data.observacion,
      usuarioId: user.id,
      fecha: ahoraIsoUtc(),
    }).returning();
    return movement;
  });
}
