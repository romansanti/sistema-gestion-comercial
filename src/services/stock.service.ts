import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { movimientosStock, productos } from "@/db/schema";
import { ApiError } from "@/lib/errors";
import { ahoraIsoUtc } from "@/lib/format";
import { moverStockSchema } from "@/lib/schemas/stock";

type StockTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** RF-P8: Cambia existencia y registra su trazabilidad en la misma transacción. */
export async function moverStock(tx: StockTransaction, input: unknown) {
  const data = moverStockSchema.parse(input);
  const [producto] = await tx
    .select()
    .from(productos)
    .where(eq(productos.id, data.productoId))
    .limit(1);

  if (!producto) {
    throw new ApiError(404, "NO_ENCONTRADO", "Producto no encontrado.");
  }
  if (data.tipo === "venta" && !producto.activo) {
    throw new ApiError(
      422,
      "PRODUCTO_INACTIVO",
      "No se puede vender un producto inactivo.",
    );
  }

  const sumaExistencia = data.tipo === "ingreso" || data.tipo === "anulacion";
  const reduceExistencia = !sumaExistencia;
  const condiciones = and(
    eq(productos.id, data.productoId),
    ...(reduceExistencia
      ? [sql`${productos.existencia} >= ${data.cantidad}`]
      : []),
    ...(data.tipo === "venta" ? [eq(productos.activo, true)] : []),
  );

  const [productoActualizado] = await tx
    .update(productos)
    .set({
      existencia: reduceExistencia
        ? sql`${productos.existencia} - ${data.cantidad}`
        : sql`${productos.existencia} + ${data.cantidad}`,
    })
    .where(condiciones)
    .returning();

  if (!productoActualizado) {
    throw new ApiError(
      409,
      "STOCK_INSUFICIENTE",
      `Stock insuficiente. Existencia actual: ${producto.existencia}.`,
    );
  }

  const [movimiento] = await tx
    .insert(movimientosStock)
    .values({
      productoId: data.productoId,
      tipo: data.tipo,
      cantidad: data.cantidad,
      existenciaResultante: productoActualizado.existencia,
      motivo: data.motivo,
      observacion: data.observacion ?? null,
      facturaId: data.facturaId ?? null,
      usuarioId: data.usuarioId,
      fecha: data.fecha ?? ahoraIsoUtc(),
    })
    .returning();

  return { producto: productoActualizado, movimiento };
}
