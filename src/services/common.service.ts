import { ApiError } from "@/lib/errors";
import type { UsuarioSesion } from "@/lib/session";

function esRestriccionDuplicada(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if (
    ("code" in error && error.code === "SQLITE_CONSTRAINT_UNIQUE") ||
    ("extendedCode" in error &&
      error.extendedCode === "SQLITE_CONSTRAINT_UNIQUE") ||
    ("message" in error &&
      typeof error.message === "string" &&
      error.message.includes("UNIQUE constraint failed"))
  ) {
    return true;
  }
  return "cause" in error && esRestriccionDuplicada(error.cause);
}

export function exigirAdmin(user: UsuarioSesion): void {
  if (user.rol !== "admin") {
    throw new ApiError(403, "SIN_PERMISO", "No tenés permiso para realizar esta acción.");
  }
}

export function validarId(id: string): number {
  const parsed = Number(id);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new ApiError(400, "VALIDACION", "El identificador no es válido.");
  }
  return parsed;
}

export function errorDuplicado(
  error: unknown,
  field: "codigo" | "documento" | "email" | "nombre",
): never {
  if (esRestriccionDuplicada(error)) {
    const config = {
      codigo: ["CODIGO_DUPLICADO", "Ya existe un producto con ese código."],
      documento: ["DOCUMENTO_DUPLICADO", "Ya existe un cliente con ese documento."],
      email: ["EMAIL_DUPLICADO", "Ya existe un usuario con ese email."],
      nombre: ["NOMBRE_DUPLICADO", "Ya existe un registro con ese nombre."],
    } as const;
    const [code, message] = config[field];
    throw new ApiError(409, code, message);
  }
  throw error;
}
