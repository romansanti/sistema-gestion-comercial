import { z } from "zod";

export const loginSchema = z
  .object({
    email: z.string().trim().email("Ingresá un email válido."),
    password: z.string().min(1, "La contraseña es obligatoria."),
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
