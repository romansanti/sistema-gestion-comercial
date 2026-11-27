import {
  and,
  count,
  desc,
  eq,
  gte,
  like,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  categorias,
  movimientosStock,
  productos,
  usuarios,
} from "@/db/schema";
import { ApiError } from "@/lib/errors";
import {
  actualizarProductoInputSchema,
  crearProductoSchema,
  listarProductosSchema,
  obtenerProductoSchema,
} from "@/lib/schemas/productos";
import {
  listarMovimientosStockSchema,
  registrarMovimientoStockInputSchema,
} from "@/lib/schemas/stock";
import type { UsuarioSesion } from "@/lib/session";
import { moverStock } from "./stock.service";

function exigirAdmin(usuario: UsuarioSesion): void {
  if (usuario.rol !== "admin") {
    throw new ApiError(
      403,
      "SIN_PERMISO",
      "Esta acción requiere permisos de administrador.",
    );
  }
}

/** RF-P1: Lista productos filtrados y paginados para el catálogo y el POS. */
export async function listarProductos(_usuario: UsuarioSesion, input: unknown) {
  const filtros = listarProductosSchema.parse(input);
  const condiciones: SQL[] = [];

  const estadoActivo = filtros.activo ?? filtros.activos;
  const stockBajo = filtros.bajoMinimo ?? filtros.stockBajo;
  if (estadoActivo !== undefined) {
    condiciones.push(eq(productos.activo, estadoActivo));
  }
  if (filtros.categoriaId !== undefined) {
    condiciones.push(eq(productos.categoriaId, filtros.categoriaId));
  }
  if (stockBajo) {
    condiciones.push(sql`${productos.existencia} <= ${productos.stockMinimo}`);
  }
  if (filtros.q) {
    const term = `%${filtros.q}%`;
    const search = or(
      like(productos.codigo, term),
      like(productos.descripcion, term),
    );
    if (search) condiciones.push(search);
  }

  const where = condiciones.length > 0 ? and(...condiciones) : undefined;
  const offset = (filtros.page - 1) * filtros.pageSize;
  const [totalRow] = await db
    .select({ total: count() })
    .from(productos)
    .where(where);
  const items = await db
    .select({
      id: productos.id,
      codigo: productos.codigo,
      descripcion: productos.descripcion,
      categoriaId: productos.categoriaId,
      categoriaNombre: categorias.nombre,
      precio: productos.precio,
      existencia: productos.existencia,
      stockMinimo: productos.stockMinimo,
      activo: productos.activo,
      createdAt: productos.createdAt,
    })
    .from(productos)
    .innerJoin(categorias, eq(productos.categoriaId, categorias.id))
    .where(where)
    .orderBy(productos.descripcion)
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

/** RF-P2: Obtiene la ficha de producto con sus movimientos recientes. */
export async function obtenerProductoPorId(
  _usuario: UsuarioSesion,
  input: unknown,
) {
  const { id } = obtenerProductoSchema.parse(input);
  const [producto] = await db
    .select({
      id: productos.id,
      codigo: productos.codigo,
      descripcion: productos.descripcion,
      categoriaId: productos.categoriaId,
      categoriaNombre: categorias.nombre,
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

  if (!producto) {
    throw new ApiError(404, "NO_ENCONTRADO", "Producto no encontrado.");
  }

  const movimientos = await listarMovimientosProducto(_usuario, { productoId: id });
  return { ...producto, movimientos };
}

/** RF-P3: Crea productos y registra la existencia inicial con moverStock(). */
export async function crearProducto(usuario: UsuarioSesion, input: unknown) {
  const data = crearProductoSchema.parse(input);
  exigirAdmin(usuario);

  const [duplicado] = await db
    .select({ id: productos.id })
    .from(productos)
    .where(sql`upper(${productos.codigo}) = upper(${data.codigo})`)
    .limit(1);

  if (duplicado) {
    throw new ApiError(
      409,
      "CODIGO_DUPLICADO",
      `Ya existe un repuesto con el código "${data.codigo}".`,
    );
  }

  const [categoria] = await db
    .select({ id: categorias.id })
    .from(categorias)
    .where(and(eq(categorias.id, data.categoriaId), eq(categorias.activa, true)))
    .limit(1);

  if (!categoria) {
    throw new ApiError(404, "NO_ENCONTRADO", "La categoría seleccionada no existe o está inactiva.");
  }

  return db.transaction(async (tx) => {
    const [creado] = await tx
      .insert(productos)
      .values({
        codigo: data.codigo,
        descripcion: data.descripcion,
        categoriaId: data.categoriaId,
        precio: data.precio,
        existencia: 0,
        stockMinimo: data.stockMinimo,
        activo: true,
      })
      .returning();

    if (data.existenciaInicial > 0) {
      const { producto } = await moverStock(tx, {
        productoId: creado.id,
        tipo: "ingreso",
        cantidad: data.existenciaInicial,
        motivo: "Stock inicial al dar de alta",
        usuarioId: usuario.id,
      });
      return producto;
    }

    return creado;
  });
}

/** RF-P4: Edita datos comerciales; la existencia no se acepta en PATCH. */
export async function actualizarProducto(usuario: UsuarioSesion, input: unknown) {
  const { id, cambios } = actualizarProductoInputSchema.parse(input);
  exigirAdmin(usuario);

  const [actual] = await db
    .select()
    .from(productos)
    .where(eq(productos.id, id))
    .limit(1);

  if (!actual) {
    throw new ApiError(404, "NO_ENCONTRADO", "Producto no encontrado.");
  }

  if (cambios.codigo && cambios.codigo.toUpperCase() !== actual.codigo.toUpperCase()) {
    const [duplicado] = await db
      .select({ id: productos.id })
      .from(productos)
      .where(and(sql`upper(${productos.codigo}) = upper(${cambios.codigo})`, ne(productos.id, id)))
      .limit(1);

    if (duplicado) {
      throw new ApiError(
        409,
        "CODIGO_DUPLICADO",
        `Ya existe otro repuesto con el código "${cambios.codigo}".`,
      );
    }
  }

  if (cambios.categoriaId !== undefined) {
    const [categoria] = await db
      .select({ id: categorias.id })
      .from(categorias)
      .where(
        and(
          eq(categorias.id, cambios.categoriaId),
          eq(categorias.activa, true),
        ),
      )
      .limit(1);

    if (!categoria) {
      throw new ApiError(404, "NO_ENCONTRADO", "La categoría no existe o está inactiva.");
    }
  }

  const [actualizado] = await db
    .update(productos)
    .set(cambios)
    .where(eq(productos.id, id))
    .returning();

  return actualizado;
}

/** RF-P8: Registra un movimiento manual y protege la existencia con moverStock(). */
export async function registrarMovimientoStock(
  usuario: UsuarioSesion,
  input: unknown,
) {
  const { productoId, cambios } =
    registrarMovimientoStockInputSchema.parse(input);
  exigirAdmin(usuario);

  return db.transaction((tx) =>
    moverStock(tx, {
      productoId,
      ...cambios,
      usuarioId: usuario.id,
    }),
  );
}

/** RF-P9: Devuelve el historial de stock de un producto. */
export async function listarMovimientosProducto(
  _usuario: UsuarioSesion,
  input: unknown,
) {
  const { productoId } = z
    .object({ productoId: z.coerce.number().int().positive() })
    .strict()
    .parse(input);

  const [producto] = await db
    .select({ id: productos.id })
    .from(productos)
    .where(eq(productos.id, productoId))
    .limit(1);

  if (!producto) {
    throw new ApiError(404, "NO_ENCONTRADO", "Producto no encontrado.");
  }

  return db
    .select({
      id: movimientosStock.id,
      productoId: movimientosStock.productoId,
      tipo: movimientosStock.tipo,
      cantidad: movimientosStock.cantidad,
      existenciaResultante: movimientosStock.existenciaResultante,
      motivo: movimientosStock.motivo,
      observacion: movimientosStock.observacion,
      facturaId: movimientosStock.facturaId,
      fecha: movimientosStock.fecha,
      usuarioId: movimientosStock.usuarioId,
      usuarioNombre: usuarios.nombre,
    })
    .from(movimientosStock)
    .innerJoin(usuarios, eq(movimientosStock.usuarioId, usuarios.id))
    .where(eq(movimientosStock.productoId, productoId))
    .orderBy(desc(movimientosStock.id))
    .limit(100);
}

/** RF-P10: Lista los movimientos de stock con filtros y paginación. */
export async function listarMovimientosStock(
  _usuario: UsuarioSesion,
  input: unknown,
) {
  const filtros = listarMovimientosStockSchema.parse(input);
  const condiciones: SQL[] = [];
  if (filtros.productoId !== undefined) {
    condiciones.push(eq(movimientosStock.productoId, filtros.productoId));
  }
  if (filtros.tipo) condiciones.push(eq(movimientosStock.tipo, filtros.tipo));
  if (filtros.desde) condiciones.push(gte(movimientosStock.fecha, filtros.desde));
  if (filtros.hasta) condiciones.push(lte(movimientosStock.fecha, filtros.hasta));
  const where = condiciones.length ? and(...condiciones) : undefined;
  const offset = (filtros.page - 1) * filtros.pageSize;
  const [totalRow] = await db
    .select({ total: count() })
    .from(movimientosStock)
    .where(where);
  const items = await db
    .select({
      id: movimientosStock.id,
      productoId: movimientosStock.productoId,
      productoCodigo: productos.codigo,
      productoDescripcion: productos.descripcion,
      tipo: movimientosStock.tipo,
      cantidad: movimientosStock.cantidad,
      existenciaResultante: movimientosStock.existenciaResultante,
      motivo: movimientosStock.motivo,
      observacion: movimientosStock.observacion,
      facturaId: movimientosStock.facturaId,
      fecha: movimientosStock.fecha,
      usuarioId: movimientosStock.usuarioId,
      usuarioNombre: usuarios.nombre,
    })
    .from(movimientosStock)
    .innerJoin(productos, eq(movimientosStock.productoId, productos.id))
    .innerJoin(usuarios, eq(movimientosStock.usuarioId, usuarios.id))
    .where(where)
    .orderBy(desc(movimientosStock.id))
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
