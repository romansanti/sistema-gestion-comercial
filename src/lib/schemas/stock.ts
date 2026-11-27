import { z } from "zod";

export const registrarMovimientoStockSchema = z
  .object({
    tipo: z.enum(["ingreso", "egreso"]),
    cantidad: z.number().int().positive("La cantidad debe ser mayor a 0."),
    motivo: z.string().trim().min(3, "Indicá un motivo válido.").max(120),
    observacion: z.string().trim().max(250).optional(),
  })
  .strict();

export const registrarMovimientoStockInputSchema = z
  .object({
    productoId: z.coerce.number().int().positive(),
    cambios: registrarMovimientoStockSchema,
  })
  .strict();

export const moverStockSchema = z
  .object({
    productoId: z.number().int().positive(),
    tipo: z.enum(["venta", "anulacion", "ingreso", "egreso"]),
    cantidad: z.number().int().positive(),
    motivo: z.string().trim().min(3).max(120),
    observacion: z.string().trim().max(250).optional(),
    facturaId: z.number().int().positive().optional(),
    usuarioId: z.number().int().positive(),
    fecha: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

export const listarMovimientosStockSchema = z
  .object({
    productoId: z.coerce.number().int().positive().optional(),
    tipo: z.enum(["venta", "anulacion", "ingreso", "egreso"]).optional(),
    desde: z.string().optional(),
    hasta: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();
