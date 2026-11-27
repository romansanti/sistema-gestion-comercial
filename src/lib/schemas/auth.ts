import { z } from "zod";

export const loginSchema = z
  .object({
    email: z.string().trim().email("Ingresá un email válido."),
    password: z.string().min(1, "La contraseña es obligatoria."),
  })
  .strict();

export const registroSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(3, "El nombre debe tener al menos 3 caracteres.")
      .max(120),
    email: z.string().trim().email("Ingresá un email válido.").max(254),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
    rol: z.enum(["admin", "vendedor"]).optional().default("vendedor"),
  })
  .strict();

export const cambiarPasswordSchema = z
  .object({
    actual: z.string().min(1, "La contraseña actual es obligatoria."),
    nueva: z
      .string()
      .min(8, "La nueva contraseña debe tener al menos 8 caracteres."),
  })
  .strict();
