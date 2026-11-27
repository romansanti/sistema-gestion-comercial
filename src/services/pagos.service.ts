import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  clientes,
  movimientosCuenta,
  pagos,
  usuarios,
} from "@/db/schema";
import { ApiError } from "@/lib/errors";
import { ahoraIsoUtc, formatearNumeroRecibo } from "@/lib/format";
import { pagoIdSchema, registrarPagoSchema } from "@/lib/schemas/pagos";
import type { UsuarioSesion } from "@/lib/session";
import { calcularSaldoCliente } from "./clientes.service";

/** RF-CC7: Registra un pago, el recibo y el crédito de cuenta en una transacción. */
export async function registrarPagoCuentaCorriente(
  usuario: UsuarioSesion,
  input: unknown,
) {
  const data = registrarPagoSchema.parse(input);

  return db.transaction(async (tx) => {
    const [cliente] = await tx
      .select()
      .from(clientes)
      .where(eq(clientes.id, data.clienteId))
      .limit(1);

    if (!cliente || !cliente.activo) {
      throw new ApiError(
        404,
        "NO_ENCONTRADO",
        "Cliente no encontrado o inactivo.",
      );
    }
    if (!cliente.cuentaCorriente) {
      throw new ApiError(
        422,
        "CUENTA_CORRIENTE_NO_HABILITADA",
        "Este cliente no opera con cuenta corriente.",
      );
    }

    const saldoActual = await calcularSaldoCliente(cliente.id, tx);
    if (data.importe > saldoActual) {
      throw new ApiError(
        422,
        "PAGO_SUPERA_DEUDA",
        "El pago ingresado supera la deuda actual del cliente.",
      );
    }

    const [maxRecibo] = await tx
      .select({ maxId: sql<number>`coalesce(max(${pagos.id}), 0)` })
      .from(pagos);
    const numeroRecibo = formatearNumeroRecibo(
      1,
      Number(maxRecibo?.maxId ?? 0) + 1,
    );
    const fecha = ahoraIsoUtc();
    const [pago] = await tx
      .insert(pagos)
      .values({
        numeroRecibo,
        clienteId: cliente.id,
        usuarioId: usuario.id,
        fecha,
        importe: data.importe,
        medio: data.medio,
        observacion: data.observacion || null,
      })
      .returning();

    await tx.insert(movimientosCuenta).values({
      clienteId: cliente.id,
      tipo: "credito",
      importe: data.importe,
      fecha,
      descripcion: `Recibo ${numeroRecibo}`,
      pagoId: pago.id,
    });

    return {
      pago,
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
        tipoDoc: cliente.tipoDoc,
        nroDoc: cliente.nroDoc,
      },
      nuevoSaldo: saldoActual - data.importe,
    };
  });
}

/** RF-CC8: Devuelve los datos públicos del recibo para consulta e impresión. */
export async function obtenerPagoDetalle(
  _usuario: UsuarioSesion,
  input: unknown,
) {
  const { id } = pagoIdSchema.parse(input);
  const [pago] = await db
    .select({
      id: pagos.id,
      numeroRecibo: pagos.numeroRecibo,
      fecha: pagos.fecha,
      importe: pagos.importe,
      medio: pagos.medio,
      observacion: pagos.observacion,
      clienteId: clientes.id,
      clienteNombre: clientes.nombre,
      clienteTipoDoc: clientes.tipoDoc,
      clienteNroDoc: clientes.nroDoc,
      usuarioNombre: usuarios.nombre,
    })
    .from(pagos)
    .innerJoin(clientes, eq(pagos.clienteId, clientes.id))
    .innerJoin(usuarios, eq(pagos.usuarioId, usuarios.id))
    .where(eq(pagos.id, id))
    .limit(1);

  if (!pago) {
    throw new ApiError(404, "NO_ENCONTRADO", "Recibo no encontrado.");
  }

  return pago;
}
