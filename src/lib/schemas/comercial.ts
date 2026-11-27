import { z } from "zod";

export const crearFacturaSchema = z
  .object({
    clienteId: z.number().int().positive().optional().nullable(),
    formaPago: z.enum(["contado", "tarjeta", "cuenta_corriente"]),
    montoRecibido: z.number().int().min(0).optional().nullable(),
    tarjetaTipo: z.enum(["debito", "credito"]).optional().nullable(),
    tarjetaMarca: z.string().trim().max(30).optional().nullable(),
    tarjetaUltimos4: z
      .string()
      .trim()
      .regex(/^\d{4}$/, "Ingresá exactamente los últimos 4 dígitos.")
      .optional()
      .nullable(),
    items: z
      .array(
        z
          .object({
            productoId: z.number().int().positive(),
            cantidad: z
              .number()
              .int()
              .positive("La cantidad debe ser al menos 1."),
          })
          .strict(),
      )
      .min(1, "La factura debe tener al menos un repuesto."),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.formaPago === "tarjeta") {
      if (!data.tarjetaTipo) {
        ctx.addIssue({
          code: "custom",
          path: ["tarjetaTipo"],
          message: "Indicá si la tarjeta es de débito o crédito.",
        });
      }
      if (!data.tarjetaMarca || data.tarjetaMarca.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["tarjetaMarca"],
          message: "Indicá la marca de la tarjeta (ej. Visa, Mastercard).",
        });
      }
      if (!data.tarjetaUltimos4) {
        ctx.addIssue({
          code: "custom",
          path: ["tarjetaUltimos4"],
          message: "Ingresá los últimos 4 dígitos del cupón.",
        });
      }
    }

    if (data.formaPago === "cuenta_corriente" && !data.clienteId) {
      ctx.addIssue({
        code: "custom",
        path: ["clienteId"],
        message: "Para vender en cuenta corriente debés seleccionar un cliente.",
      });
    }
  });

export const anularFacturaSchema = z
  .object({
    motivoAnulacion: z
      .string()
      .trim()
      .min(5, "El motivo de anulación debe tener al menos 5 caracteres.")
      .max(200),
  })
  .strict();
