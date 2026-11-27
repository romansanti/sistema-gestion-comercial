import { z } from "zod";

export const listarUsuariosSchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10),
  })
  .strict();

export const crearUsuarioSchema = z
  .object({
    nombre: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres."),
    email: z.string().trim().email("Email inválido.").toLowerCase(),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
    rol: z.enum(["admin", "vendedor"]),
  })
  .strict();

export const cambiosUsuarioSchema = z
  .object({
    nombre: z.string().trim().min(3).optional(),
    email: z.string().trim().email().toLowerCase().optional(),
    rol: z.enum(["admin", "vendedor"]).optional(),
    activo: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Indicá al menos un campo para actualizar.",
  });

export const actualizarUsuarioSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    cambios: cambiosUsuarioSchema,
  })
  .strict();

export const restablecerPasswordUsuarioSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  })
  .strict();
