import { unstable_rethrow } from "next/navigation";
import { traducirErrorApi } from "./api-handler";
import type { UsuarioSesion } from "./session";
import { exigirSesion } from "./session";

export type ActionResult<T> =
  | { data: T }
  | {
      error: {
        code: string;
        message: string;
        details?: Array<{ campo?: string; mensaje?: string }>;
      };
    };

type AuthenticatedAction<TInput, TResult> = (
  usuario: UsuarioSesion,
  datosSinValidar: TInput,
) => Promise<TResult>;

type PublicAction<TInput, TResult> = (datosSinValidar: TInput) => Promise<TResult>;

export function conSesion<TInput, TResult>(
  action: AuthenticatedAction<TInput, TResult>,
) {
  return async (datosSinValidar: TInput): Promise<ActionResult<TResult>> => {
    try {
      const usuario = await exigirSesion();
      const data = await action(usuario, datosSinValidar);
      return { data };
    } catch (error) {
      unstable_rethrow(error);
      const { body } = traducirErrorApi(error);
      return body;
    }
  };
}

export function conAccionPublica<TInput, TResult>(
  action: PublicAction<TInput, TResult>,
) {
  return async (datosSinValidar: TInput): Promise<ActionResult<TResult>> => {
    try {
      return { data: await action(datosSinValidar) };
    } catch (error) {
      unstable_rethrow(error);
      const { body } = traducirErrorApi(error);
      return body;
    }
  };
}
