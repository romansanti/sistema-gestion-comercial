import { z } from "zod";

export const listarCategoriasSchema = z
  .object({
    activas: z.string().optional().transform((value) => value === "true"),
  })
  .strict();

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
    id: z.coerce.number().int().positive(),
    cambios: z
      .object({
        nombre: z.string().trim().min(2).max(60).optional(),
        activa: z.boolean().optional(),
      })
      .strict()
      .refine((data) => Object.keys(data).length > 0, {
        message: "Ingresá al menos un campo para actualizar.",
      }),
  })
  .strict();
