import crypto from "crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { ApiError } from "./errors";

const COOKIE_NAME = "sgc_session";

export interface UsuarioSesion {
  id: number;
  nombre: string;
  email: string;
  rol: "admin" | "vendedor";
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET no está configurado correctamente.");
  }
  return secret;
}

export function firmarToken(userId: number): string {
  const payload = `${userId}.${Date.now()}`;
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

export function verificarToken(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userIdStr, ts, sig] = parts;
  const expectedSig = crypto
    .createHmac("sha256", getSecret())
    .update(`${userIdStr}.${ts}`)
    .digest("hex");

  const sigBuf = Buffer.from(sig, "hex");
  const expBuf = Buffer.from(expectedSig, "hex");
  if (
    sigBuf.length !== expBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expBuf)
  ) {
    return null;
  }
  const id = Number(userIdStr);
  return Number.isInteger(id) && id > 0 ? id : null;
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
