import {
  formatearFecha,
  formatearMoneda,
} from "@/lib/format";

export type SessionUser = {
  id: number;
  nombre: string;
  email: string;
  rol: "admin" | "vendedor";
};

export async function api<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(path, {
    ...init,
    headers,
    cache: "no-store",
  });
  if (response.status === 204) return undefined as T;
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "object" &&
      payload.error !== null &&
      "message" in payload.error &&
      typeof payload.error.message === "string"
        ? payload.error.message
        : "No se pudo completar la solicitud. Intentá nuevamente.";
    throw new Error(message);
  }
  return payload as T;
}

export function formatMoney(value: number | null | undefined) {
  return formatearMoneda(value ?? 0);
}

export function moneyInput(value: number) {
  return (value / 100).toFixed(2);
}

export function moneyToCents(value: string) {
  return Math.round(Number(value) * 100);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return formatearFecha(value);
  } catch {
    return value;
  }
}

export function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}
