import { NextRequest, NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { ApiError } from "./errors";
import { exigirSesion, UsuarioSesion } from "./session";

type HandlerFn<TContext = unknown> = (
  req: NextRequest,
  ctx: TContext,
  user: UsuarioSesion,
) => Promise<NextResponse>;

type PublicHandlerFn<TContext = unknown> = (
  req: NextRequest,
  ctx: TContext,
) => Promise<NextResponse>;

export interface ApiErrorResponse {
  status: number;
  body: {
    error: {
      code: string;
      message: string;
      details?: Array<{ campo?: string; mensaje?: string }>;
    };
  };
}

export function traducirErrorApi(err: unknown): ApiErrorResponse {
  if (err instanceof ApiError) {
    return {
      status: err.status,
      body: {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      },
    };
  }

  if (err instanceof ZodError) {
    return {
      status: 422,
      body: {
        error: {
          code: "VALIDACION",
          message: "Hay campos con errores.",
          details: err.issues.map((issue) => ({
            campo: issue.path.join(".") || "cuerpo",
            mensaje: issue.message,
          })),
        },
      },
    };
  }

  console.error("[API_ERROR_INTERNO]", err);
  return {
    status: 500,
    body: {
      error: {
        code: "ERROR_INTERNO",
        message: "Ocurrió un error inesperado en el servidor.",
      },
    },
  };
}

function manejarError(err: unknown): NextResponse {
  const { status, body } = traducirErrorApi(err);
  return NextResponse.json(body, { status });
}

export function withAuth<TContext = unknown>(
  handler: HandlerFn<TContext>,
) {
  return async (req: NextRequest, ctx: TContext) => {
    try {
      const user = await exigirSesion();
      return await handler(req, ctx, user);
    } catch (err) {
      unstable_rethrow(err);
      return manejarError(err);
    }
  };
}

export function withPublic<TContext = unknown>(
  handler: PublicHandlerFn<TContext>,
) {
  return async (req: NextRequest, ctx: TContext) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      unstable_rethrow(err);
      return manejarError(err);
    }
  };
}

export async function parseJsonBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ApiError(
      400,
      "JSON_INVALIDO",
      "El cuerpo de la petición no es un JSON válido.",
    );
  }
}
