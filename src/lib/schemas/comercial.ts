import { z } from "zod";

export const crearClienteSchema = z.object({
  tipoDoc: z.enum(["DNI", "CUIT"]),
  nroDoc: z
    .string()
    .trim()
    .min(7, "El documento debe tener al menos 7 caracteres.")
    .max(15, "El documento no puede superar los 15 caracteres."),
  nombre: z
    .string()
    .trim()
    .min(3, "El nombre o razón social debe tener al menos 3 caracteres.")
    .max(120),
  domicilio: z.string().trim().max(150).optional().nullable(),
  telefono: z.string().trim().max(30).optional().nullable(),
  email: z
    .string()
    .trim()
    .email("Ingresá un email válido.")
    .optional()
    .nullable()
    .or(z.literal("")),
  cuentaCorriente: z.boolean().default(false),
  limiteCredito: z.number().int().min(0).optional().nullable(),
});

export const actualizarClienteSchema = crearClienteSchema
  .partial()
  .extend({
    activo: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Ingresá al menos un campo para actualizar.",
  });

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
        z.object({
          productoId: z.number().int().positive(),
          cantidad: z
            .number()
            .int()
            .positive("La cantidad debe ser al menos 1."),
        }),
      )
      .min(1, "La factura debe tener al menos un repuesto."),
  })
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

export const anularFacturaSchema = z.object({
  motivoAnulacion: z
    .string()
    .trim()
    .min(5, "El motivo de anulación debe tener al menos 5 caracteres.")
    .max(200),
});

export const registrarPagoSchema = z.object({
  clienteId: z.number().int().positive("Seleccioná un cliente válido."),
  importe: z
    .number()
    .int()
    .positive("El importe del pago debe ser mayor a $ 0,00."),
  medio: z.enum(["efectivo", "transferencia", "tarjeta_debito"]),
  observacion: z.string().trim().max(200).optional().nullable(),
});
