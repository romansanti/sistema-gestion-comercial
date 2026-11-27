import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { ApiError } from "./errors";
import { firmarToken, verificarToken } from "./session-token";

export { firmarToken, verificarToken } from "./session-token";

const COOKIE_NAME = "sgc_session";

export interface UsuarioSesion {
  id: number;
  nombre: string;
  email: string;
  rol: "admin" | "vendedor";
}

export async function crearCookieSesion(userId: number): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, firmarToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function borrarCookieSesion(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** Resuelve el usuario activo desde la BD en cada pedido (Sección 10.5) */
export async function obtenerUsuarioActual(): Promise<UsuarioSesion | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const userId = verificarToken(token);
  if (!userId) return null;

  const [user] = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      email: usuarios.email,
      rol: usuarios.rol,
      activo: usuarios.activo,
    })
    .from(usuarios)
    .where(eq(usuarios.id, userId))
    .limit(1);

  if (!user || !user.activo) return null;

  return {
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
  };
}

export async function exigirSesion(): Promise<UsuarioSesion> {
  const user = await obtenerUsuarioActual();
  if (!user) {
    throw new ApiError(
      401,
      "NO_AUTENTICADO",
      "Debés iniciar sesión para continuar.",
    );
  }
  return user;
}

export async function exigirAdmin(): Promise<UsuarioSesion> {
  const user = await exigirSesion();
  if (user.rol !== "admin") {
    throw new ApiError(
      403,
      "SIN_PERMISO",
      "Esta acción requiere permisos de administrador.",
    );
  }
  return user;
}
