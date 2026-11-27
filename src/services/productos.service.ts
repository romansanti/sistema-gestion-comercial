import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { categorias, movimientosStock, productos, usuarios } from "@/db/schema";
import { ApiError } from "@/lib/errors";
import { ahoraIsoUtc } from "@/lib/format";

export async function listarProductos(filtros?: {
  q?: string;
  categoriaId?: number;
  soloActivos?: boolean;
  stockBajo?: boolean;
}) {
  const condiciones: SQL[] = [];

  if (filtros?.soloActivos) {
    condiciones.push(eq(productos.activo, true));
  }

  if (filtros?.categoriaId !== undefined) {
    condiciones.push(eq(productos.categoriaId, filtros.categoriaId));
  }

  if (filtros?.stockBajo) {
    condiciones.push(sql`${productos.existencia} <= ${productos.stockMinimo}`);
  }

  if (filtros?.q && filtros.q.trim() !== "") {
    const term = `%${filtros.q.trim()}%`;
    const search = or(like(productos.codigo, term), like(productos.descripcion, term));
    if (search) condiciones.push(search);
  }

  return db
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
    .where(condiciones.length > 0 ? and(...condiciones) : undefined)
    .orderBy(productos.descripcion);
}

export async function obtenerProductoPorId(id: number) {
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

  const movimientos = await db
    .select({
      id: movimientosStock.id,
      tipo: movimientosStock.tipo,
      cantidad: movimientosStock.cantidad,
      existenciaResultante: movimientosStock.existenciaResultante,
      motivo: movimientosStock.motivo,
      observacion: movimientosStock.observacion,
      fecha: movimientosStock.fecha,
      usuarioNombre: usuarios.nombre,
    })
    .from(movimientosStock)
    .innerJoin(usuarios, eq(movimientosStock.usuarioId, usuarios.id))
    .where(eq(movimientosStock.productoId, id))
    .orderBy(desc(movimientosStock.id))
    .limit(50);

  return { ...producto, movimientos };
}

export async function crearProducto(
  data: {
    codigo: string;
    descripcion: string;
    categoriaId: number;
    precio: number;
    existenciaInicial: number;
    stockMinimo: number;
  },
  usuarioId: number,
) {
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
    .where(eq(categorias.id, data.categoriaId))
    .limit(1);

  if (!categoria) {
    throw new ApiError(404, "NO_ENCONTRADO", "La categoría seleccionada no existe.");
  }

  return db.transaction(async (tx) => {
    const [creado] = await tx
      .insert(productos)
      .values({
        codigo: data.codigo,
        descripcion: data.descripcion,
        categoriaId: data.categoriaId,
        precio: data.precio,
        existencia: data.existenciaInicial,
        stockMinimo: data.stockMinimo,
        activo: true,
      })
      .returning();

    if (data.existenciaInicial > 0) {
      await tx.insert(movimientosStock).values({
        productoId: creado.id,
        tipo: "ingreso",
        cantidad: data.existenciaInicial,
        existenciaResultante: data.existenciaInicial,
        motivo: "Stock inicial al dar de alta",
        usuarioId,
        fecha: ahoraIsoUtc(),
      });
    }

    return creado;
  });
}

export async function actualizarProducto(
  id: number,
  data: {
    codigo?: string;
    descripcion?: string;
    categoriaId?: number;
    precio?: number;
    stockMinimo?: number;
    activo?: boolean;
  },
) {
  const [actual] = await db
    .select()
    .from(productos)
    .where(eq(productos.id, id))
    .limit(1);

  if (!actual) {
    throw new ApiError(404, "NO_ENCONTRADO", "Producto no encontrado.");
  }

  if (data.codigo && data.codigo.toUpperCase() !== actual.codigo.toUpperCase()) {
    const [duplicado] = await db
      .select({ id: productos.id })
      .from(productos)
      .where(sql`upper(${productos.codigo}) = upper(${data.codigo})`)
      .limit(1);

    if (duplicado) {
      throw new ApiError(
        409,
        "CODIGO_DUPLICADO",
        `Ya existe otro repuesto con el código "${data.codigo}".`,
      );
    }
  }

  if (data.categoriaId !== undefined) {
    const [categoria] = await db
      .select({ id: categorias.id })
      .from(categorias)
      .where(eq(categorias.id, data.categoriaId))
      .limit(1);

    if (!categoria) {
      throw new ApiError(404, "NO_ENCONTRADO", "La categoría seleccionada no existe.");
    }
  }

  const [actualizado] = await db
    .update(productos)
    .set({
      ...(data.codigo !== undefined ? { codigo: data.codigo } : {}),
      ...(data.descripcion !== undefined ? { descripcion: data.descripcion } : {}),
      ...(data.categoriaId !== undefined ? { categoriaId: data.categoriaId } : {}),
      ...(data.precio !== undefined ? { precio: data.precio } : {}),
      ...(data.stockMinimo !== undefined ? { stockMinimo: data.stockMinimo } : {}),
      ...(data.activo !== undefined ? { activo: data.activo } : {}),
    })
    .where(eq(productos.id, id))
    .returning();

  return actualizado;
}

export async function registrarMovimientoStock(
  productoId: number,
  data: {
    tipo: "ingreso" | "egreso";
    cantidad: number;
    motivo: string;
    observacion?: string;
  },
  usuarioId: number,
) {
  return db.transaction(async (tx) => {
    const [producto] = await tx
      .select()
      .from(productos)
      .where(eq(productos.id, productoId))
      .limit(1);

    if (!producto) {
      throw new ApiError(404, "NO_ENCONTRADO", "Producto no encontrado.");
    }

    const delta = data.tipo === "ingreso" ? data.cantidad : -data.cantidad;
    const existenciaResultante = producto.existencia + delta;

    if (existenciaResultante < 0) {
      throw new ApiError(
        409,
        "STOCK_INSUFICIENTE",
        `Stock insuficiente. Existencia actual: ${producto.existencia}.`,
      );
    }

    const actualizados = await tx
      .update(productos)
      .set({ existencia: sql`${productos.existencia} + ${delta}` })
      .where(
        data.tipo === "egreso"
          ? and(
              eq(productos.id, productoId),
              sql`${productos.existencia} >= ${data.cantidad}`,
            )
          : eq(productos.id, productoId),
      )
      .returning();

    if (actualizados.length === 0) {
      throw new ApiError(
        409,
        "STOCK_INSUFICIENTE",
        "El stock cambió concurrentemente y no alcanza para el egreso.",
      );
    }

    const productoActualizado = actualizados[0];
    const [movimiento] = await tx
      .insert(movimientosStock)
      .values({
        productoId,
        tipo: data.tipo,
        cantidad: data.cantidad,
        existenciaResultante: productoActualizado.existencia,
        motivo: data.motivo,
        observacion: data.observacion ?? null,
        usuarioId,
        fecha: ahoraIsoUtc(),
      })
      .returning();

    return { producto: productoActualizado, movimiento };
  });
}
