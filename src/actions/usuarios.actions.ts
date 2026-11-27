"use server";

import { conSesion } from "@/lib/action-handler";
import {
  actualizarUsuario,
  crearUsuario,
  listarUsuarios,
  restablecerPasswordUsuario,
} from "@/services/usuarios.service";

export const listarUsuariosAction = conSesion(listarUsuarios);
export const crearUsuarioAction = conSesion(crearUsuario);
export const actualizarUsuarioAction = conSesion(actualizarUsuario);
export const restablecerPasswordUsuarioAction = conSesion(restablecerPasswordUsuario);
