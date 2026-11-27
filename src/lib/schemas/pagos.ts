import { z } from "zod";

export const registrarPagoSchema = z
  .object({
    clienteId: z.number().int().positive("Seleccioná un cliente válido."),
    importe: z.number().int().positive("El importe debe ser mayor a $ 0,00."),
    medio: z.enum(["efectivo", "transferencia", "tarjeta_debito"]),
    observacion: z.string().trim().max(200).optional().nullable(),
  })
  .strict();

export const pagoIdSchema = z
  .object({ id: z.coerce.number().int().positive() })
  .strict();
