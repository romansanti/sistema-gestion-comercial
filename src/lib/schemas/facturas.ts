import { z } from "zod";
import {
  anularFacturaSchema,
  crearFacturaSchema,
} from "./comercial";

const fecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  })
  .optional();

export { anularFacturaSchema, crearFacturaSchema };

export const listarFacturasSchema = z
  .object({
    estado: z.enum(["emitida", "anulada"]).optional(),
    clienteId: z.coerce.number().int().positive().optional(),
    formaPago: z
      .enum(["contado", "tarjeta", "cuenta_corriente"])
      .optional(),
    desde: fecha,
    hasta: fecha,
    q: z.string().trim().optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()
  .refine(
    ({ desde, hasta }) => !desde || !hasta || desde <= hasta,
    "La fecha inicial no puede ser posterior a la fecha final.",
  );

export const facturaIdSchema = z
  .object({ id: z.coerce.number().int().positive() })
  .strict();

export const anularFacturaInputSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    motivoAnulacion: anularFacturaSchema.shape.motivoAnulacion,
  })
  .strict();
