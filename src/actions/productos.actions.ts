"use server";

import { conSesion } from "@/lib/action-handler";
import {
  actualizarProducto,
  crearProducto,
  listarMovimientosProducto,
  listarMovimientosStock,
  listarProductos,
  obtenerProductoPorId,
  registrarMovimientoStock,
} from "@/services/productos.service";

export const listarProductosAction = conSesion(listarProductos);
export const obtenerProductoAction = conSesion(obtenerProductoPorId);
export const crearProductoAction = conSesion(crearProducto);
export const actualizarProductoAction = conSesion(actualizarProducto);
export const registrarMovimientoStockAction = conSesion(registrarMovimientoStock);
export const listarMovimientosProductoAction = conSesion(listarMovimientosProducto);
export const listarMovimientosStockAction = conSesion(listarMovimientosStock);
