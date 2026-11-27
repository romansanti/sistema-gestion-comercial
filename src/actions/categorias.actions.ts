"use server";

import { conSesion } from "@/lib/action-handler";
import {
  actualizarCategoria,
  crearCategoria,
  listarCategorias,
} from "@/services/categorias.service";

export const listarCategoriasAction = conSesion(listarCategorias);
export const crearCategoriaAction = conSesion(crearCategoria);
export const actualizarCategoriaAction = conSesion(actualizarCategoria);
