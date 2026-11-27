"use server";

import {
  borrarCookieSesion,
  crearCookieSesion,
} from "@/lib/session";
import {
  conAccionPublica,
  conSesion,
} from "@/lib/action-handler";
import {
  cambiarPasswordPropia,
  loginUsuario,
} from "@/services/auth.service";

export const loginAction = conAccionPublica(async (datosSinValidar: unknown) => {
  const usuario = await loginUsuario(null, datosSinValidar);
  await crearCookieSesion(usuario.id);
  return usuario;
});

export const logoutAction = conAccionPublica(async () => {
  await borrarCookieSesion();
  return null;
});

export const cambiarPasswordAction = conSesion(cambiarPasswordPropia);
