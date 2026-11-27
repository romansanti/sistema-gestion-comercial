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

function manejarError(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      },
      { status: err.status },
    );
  }

  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDACION",
          message: "Hay campos con errores.",
          details: err.issues.map((issue) => ({
            campo: issue.path.join(".") || "cuerpo",
            mensaje: issue.message,
          })),
        },
      },
      { status: 422 },
    );
  }

  console.error("[API_ERROR_INTERNO]", err);
  return NextResponse.json(
    {
      error: {
        code: "ERROR_INTERNO",
        message: "Ocurrió un error inesperado en el servidor.",
      },
    },
    { status: 500 },
  );
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
