import { z } from "zod";

export const crearCategoriaSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres.")
      .max(60, "El nombre no puede superar los 60 caracteres."),
  })
  .strict();

export const actualizarCategoriaSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres.")
      .max(60, "El nombre no puede superar los 60 caracteres.")
      .optional(),
    activa: z.boolean().optional(),
  })
  .strict()
  .refine((data) => data.nombre !== undefined || data.activa !== undefined, {
    message: "Ingresá al menos un campo para actualizar.",
  });

export const crearProductoSchema = z
  .object({
    codigo: z
      .string()
      .trim()
      .min(2, "El código debe tener al menos 2 caracteres.")
      .max(30, "El código no puede superar los 30 caracteres.")
      .transform((value) => value.toUpperCase()),
    descripcion: z
      .string()
      .trim()
      .min(3, "La descripción debe tener al menos 3 caracteres.")
      .max(150, "La descripción no puede superar los 150 caracteres."),
    categoriaId: z.number().int().positive("Seleccioná una categoría válida."),
    precio: z
      .number()
      .int("El precio en centavos debe ser un entero.")
      .positive("El precio debe ser mayor a $ 0,00."),
    existenciaInicial: z
      .number()
      .int()
      .min(0, "La existencia inicial no puede ser negativa.")
      .default(0),
    stockMinimo: z
      .number()
      .int()
      .min(0, "El stock mínimo no puede ser negativo.")
      .default(0),
  })
  .strict();

export const actualizarProductoSchema = z
  .object({
    codigo: z
      .string()
      .trim()
      .min(2, "El código debe tener al menos 2 caracteres.")
      .max(30, "El código no puede superar los 30 caracteres.")
      .transform((value) => value.toUpperCase())
      .optional(),
    descripcion: z
      .string()
      .trim()
      .min(3, "La descripción debe tener al menos 3 caracteres.")
      .max(150, "La descripción no puede superar los 150 caracteres.")
      .optional(),
    categoriaId: z.number().int().positive().optional(),
    precio: z
      .number()
      .int()
      .positive("El precio debe ser mayor a $ 0,00.")
      .optional(),
    stockMinimo: z.number().int().min(0).optional(),
    activo: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Ingresá al menos un campo para actualizar.",
  });

export const movimientoStockSchema = z
  .object({
    tipo: z.enum(["ingreso", "egreso"]),
    cantidad: z
      .number()
      .int()
      .positive("La cantidad debe ser mayor a 0."),
    motivo: z
      .string()
      .trim()
      .min(3, "Indicá un motivo válido.")
      .max(120),
    observacion: z.string().trim().max(250).optional(),
  })
  .strict();
