import { z } from "zod";

const booleanQuery = z
  .enum(["true", "false"])
  .optional()
  .transform((value) =>
    value === undefined ? undefined : value === "true",
  );

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

export const listarProductosSchema = z
  .object({
    q: z.string().trim().optional(),
    categoriaId: z.coerce.number().int().positive().optional(),
    activo: booleanQuery,
    activos: booleanQuery,
    bajoMinimo: booleanQuery,
    stockBajo: booleanQuery,
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(100),
  })
  .strict();

export const obtenerProductoSchema = z
  .object({ id: z.coerce.number().int().positive() })
  .strict();

export const actualizarProductoInputSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    cambios: actualizarProductoSchema,
  })
  .strict();
