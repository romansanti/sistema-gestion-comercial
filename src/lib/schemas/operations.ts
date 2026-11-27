import { z } from "zod";

const nombre = z.string().trim().min(2).max(120);
const email = z.string().trim().email().max(254);
const positivo = z.number().int().positive().safe();
const enteroNoNegativo = z.number().int().min(0).safe();

export const usuarioCrearSchema = z
  .object({
    nombre,
    email,
    password: z.string().min(8).max(128),
    rol: z.enum(["admin", "vendedor"]),
  })
  .strict();

export const usuarioActualizarSchema = z
  .object({
    nombre,
    email,
    rol: z.enum(["admin", "vendedor"]),
  })
  .strict();

export const estadoSchema = z.object({ activo: z.boolean() }).strict();
export const categoriaSchema = z.object({ nombre }).strict();

export const productoSchema = z
  .object({
    codigo: z.string().trim().min(1).max(40),
    descripcion: z.string().trim().min(2).max(200),
    categoriaId: positivo,
    precio: enteroNoNegativo,
    existencia: enteroNoNegativo.optional(),
    stockMinimo: enteroNoNegativo,
  })
  .strict();

export const movimientoStockSchema = z
  .object({
    tipo: z.enum(["ingreso", "egreso"]),
    cantidad: positivo,
    motivo: z.string().trim().min(2).max(200),
    observacion: z.string().trim().max(500).optional(),
  })
  .strict();

export const clienteSchema = z
  .object({
    tipoDoc: z.enum(["DNI", "CUIT"]),
    nroDoc: z.string().trim().min(5).max(20),
    nombre,
    domicilio: z.string().trim().max(200).nullable().optional(),
    telefono: z.string().trim().max(40).nullable().optional(),
    email: z.string().trim().email().max(254).nullable().optional(),
    cuentaCorriente: z.boolean(),
    limiteCredito: enteroNoNegativo.nullable().optional(),
  })
  .strict();

export const pagoSchema = z
  .object({
    importe: positivo,
    medio: z.enum(["efectivo", "transferencia", "tarjeta_debito"]),
    observacion: z.string().trim().max(500).optional(),
  })
  .strict();

export const facturaSchema = z
  .object({
    clienteId: positivo.nullable().optional(),
    formaPago: z.enum(["contado", "tarjeta", "cuenta_corriente"]),
    montoRecibido: enteroNoNegativo.optional(),
    tarjetaTipo: z.enum(["debito", "credito"]).optional(),
    tarjetaMarca: z.string().trim().min(1).max(40).optional(),
    tarjetaUltimos4: z.string().regex(/^\d{4}$/).optional(),
    items: z
      .array(
        z
          .object({ productoId: positivo, cantidad: positivo })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();

export const anularFacturaSchema = z
  .object({ motivoAnulacion: z.string().trim().min(3).max(500) })
  .strict();
