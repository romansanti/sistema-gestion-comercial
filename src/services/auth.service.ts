import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { ApiError } from "@/lib/errors";
import {
  cambiarPasswordSchema,
  loginSchema,
  registroSchema,
} from "@/lib/schemas/auth";
import { UsuarioSesion } from "@/lib/session";
import { errorDuplicado } from "./common.service";

export async function registrarUsuario(input: unknown): Promise<UsuarioSesion> {
  const data = registroSchema.parse(input);
  const email = data.email.toLowerCase();
  const [existing] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(sql`lower(${usuarios.email}) = ${email}`)
    .limit(1);

  if (existing) {
    throw new ApiError(409, "EMAIL_DUPLICADO", "Ya existe un usuario con ese email.");
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const rol =
    process.env.NODE_ENV === "production" ? "vendedor" : data.rol;

  try {
    const [user] = await db
      .insert(usuarios)
      .values({
        nombre: data.nombre,
        email,
        passwordHash,
        rol,
        activo: true,
      })
      .returning({
        id: usuarios.id,
        nombre: usuarios.nombre,
        email: usuarios.email,
        rol: usuarios.rol,
      });

    return user;
  } catch (error) {
    errorDuplicado(error, "email");
  }
}

/** RF-U1: Autentica un usuario activo con email y contraseña */
export async function loginUsuario(input: unknown): Promise<UsuarioSesion> {
  const data = loginSchema.parse(input);
  const emailNormalizado = data.email.toLowerCase();

  const [user] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.email, emailNormalizado))
    .limit(1);

  if (!user || !user.activo) {
    throw new ApiError(
      401,
      "CREDENCIALES_INVALIDAS",
      "Email o contraseña incorrectos.",
    );
  }

  const coincide = await bcrypt.compare(data.password, user.passwordHash);
  if (!coincide) {
    throw new ApiError(
      401,
      "CREDENCIALES_INVALIDAS",
      "Email o contraseña incorrectos.",
    );
  }

  return {
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
  };
}

/** RF-U5: Permite al usuario autenticado cambiar su propia contraseña */
export async function cambiarPasswordPropia(
  user: UsuarioSesion,
  input: unknown,
): Promise<void> {
  const data = cambiarPasswordSchema.parse(input);

  const [dbUser] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.id, user.id))
    .limit(1);

  if (!dbUser || !dbUser.activo) {
    throw new ApiError(401, "NO_AUTENTICADO", "Usuario inválido.");
  }

  const coincide = await bcrypt.compare(data.actual, dbUser.passwordHash);
  if (!coincide) {
    throw new ApiError(
      422,
      "CONTRASENA_ACTUAL_INCORRECTA",
      "La contraseña actual es incorrecta.",
    );
  }

  const nuevoHash = await bcrypt.hash(data.nueva, 10);
  await db
    .update(usuarios)
    .set({ passwordHash: nuevoHash })
    .where(eq(usuarios.id, user.id));
}
