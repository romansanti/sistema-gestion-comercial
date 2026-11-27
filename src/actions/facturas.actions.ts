"use server";

import { conSesion } from "@/lib/action-handler";
import {
  anularFactura,
  crearFactura,
  listarFacturas,
  obtenerFacturaDetalle,
} from "@/services/facturas.service";

export const listarFacturasAction = conSesion(listarFacturas);
export const obtenerFacturaAction = conSesion(obtenerFacturaDetalle);
export const crearFacturaAction = conSesion(crearFactura);
export const anularFacturaAction = conSesion(anularFactura);
