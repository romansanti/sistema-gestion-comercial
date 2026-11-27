"use server";

import { conSesion } from "@/lib/action-handler";
import {
  actualizarCliente,
  crearCliente,
  listarClientes,
  obtenerClienteDetalle,
  obtenerCuentaCliente,
} from "@/services/clientes.service";
import {
  obtenerPagoDetalle,
  registrarPagoCuentaCorriente,
} from "@/services/pagos.service";

export const listarClientesAction = conSesion(listarClientes);
export const obtenerClienteAction = conSesion(obtenerClienteDetalle);
export const crearClienteAction = conSesion(crearCliente);
export const actualizarClienteAction = conSesion(actualizarCliente);
export const obtenerCuentaClienteAction = conSesion(obtenerCuentaCliente);
export const registrarPagoAction = conSesion(registrarPagoCuentaCorriente);
export const obtenerReciboAction = conSesion(obtenerPagoDetalle);
