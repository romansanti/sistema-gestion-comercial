import { z } from "zod";

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  });

const booleanQuery = z
  .enum(["true", "false"])
  .optional()
  .transform((value) =>
    value === undefined ? undefined : value === "true",
  );

export const listarClientesSchema = z
  .object({
    q: z.string().trim().optional(),
    cuentaCorriente: booleanQuery,
    activo: booleanQuery,
    activos: booleanQuery,
    conDeuda: booleanQuery,
    ordenar: z.enum(["saldo", "nombre"]).default("nombre"),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(100),
  })
  .strict();

export const crearClienteSchema = z
  .object({
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
  })
  .strict();

export const actualizarClienteCambiosSchema = crearClienteSchema
  .partial()
  .extend({ activo: z.boolean().optional() })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Ingresá al menos un campo para actualizar.",
  });

export const actualizarClienteSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    cambios: actualizarClienteCambiosSchema,
  })
  .strict();

export const clienteIdSchema = z
  .object({ id: z.coerce.number().int().positive() })
  .strict();

export const cuentaClienteSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    desde: dateOnly.optional(),
    hasta: dateOnly.optional(),
  })
  .strict()
  .refine(
    ({ desde, hasta }) => !desde || !hasta || desde <= hasta,
    "La fecha inicial no puede ser posterior a la fecha final.",
  );
