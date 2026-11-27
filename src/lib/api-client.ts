export interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
    details?: Array<{ campo?: string; mensaje?: string }>;
  };
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
    readonly details?: NonNullable<ApiErrorResponse["error"]>["details"],
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (error) {
    throw new ApiRequestError(
      error instanceof Error
        ? error.message
        : "No se pudo conectar con el servidor.",
    );
  }

  if (response.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new Event("session-expired"));
    throw new ApiRequestError("La sesión expiró.", 401, "NO_AUTENTICADO");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new ApiRequestError(
      response.ok
        ? "El servidor devolvió una respuesta inválida."
        : "Error al procesar la solicitud.",
      response.status,
    );
  }

  if (!response.ok) {
    const body = json as ApiErrorResponse;
    const error = body.error;
    throw new ApiRequestError(
      error?.details?.[0]?.mensaje ||
        error?.message ||
        "Error al procesar la solicitud.",
      response.status,
      error?.code,
      error?.details,
    );
  }

  if (
    typeof json !== "object" ||
    json === null ||
    !("data" in json)
  ) {
    throw new ApiRequestError(
      "El servidor devolvió una respuesta sin datos.",
      response.status,
    );
  }

  return json.data as T;
}

export function pesosAcentavos(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;

  const centavos =
    Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(centavos) ? centavos : null;
}
