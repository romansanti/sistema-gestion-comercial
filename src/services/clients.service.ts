import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  clientes,
  movimientosCuenta,
  pagos,
  usuarios,
} from "@/db/schema";
import { ApiError } from "@/lib/errors";
import { ahoraIsoUtc, formatearNumeroRecibo } from "@/lib/format";
import { clienteSchema, estadoSchema, pagoSchema } from "@/lib/schemas/operations";
import type { UsuarioSesion } from "@/lib/session";
import { errorDuplicado, validarId } from "./common.service";

async function obtenerSaldosClientes() {
  const rows = await db
    .select({
      clienteId: movimientosCuenta.clienteId,
      saldo: sql<number>`coalesce(sum(case when ${movimientosCuenta.tipo} = 'debito' then ${movimientosCuenta.importe} else -${movimientosCuenta.importe} end), 0)`,
    })
    .from(movimientosCuenta)
    .groupBy(movimientosCuenta.clienteId);
  return new Map(rows.map((row) => [row.clienteId, Number(row.saldo)]));
}

export async function listarClientes(filters: {
  q?: string | null;
  conSaldo?: string | null;
  orden?: string | null;
  estado?: string | null;
}) {
  const conditions = [];
  if (filters.q?.trim()) {
    const q = `%${filters.q.trim()}%`;
    conditions.push(or(like(clientes.nombre, q), like(clientes.nroDoc, q))!);
  }
  if (filters.estado === "activos") conditions.push(eq(clientes.activo, true));
  if (filters.estado === "inactivos") conditions.push(eq(clientes.activo, false));
  const rows = await db.select().from(clientes)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(filters.orden === "nombre_desc" ? desc(clientes.nombre) : asc(clientes.nombre));
  const balances = await obtenerSaldosClientes();
  return rows
    .map((client) => ({ ...client, saldo: balances.get(client.id) ?? 0 }))
    .filter((client) => filters.conSaldo !== "true" || client.saldo > 0);
}

export async function obtenerCliente(idRaw: string) {
  const id = validarId(idRaw);
  const [client] = await db.select().from(clientes)
    .where(eq(clientes.id, id)).limit(1);
  if (!client) throw new ApiError(404, "NO_ENCONTRADO", "Cliente no encontrado.");
  const balances = await obtenerSaldosClientes();
  return { ...client, saldo: balances.get(id) ?? 0 };
}

export async function guardarCliente(input: unknown, idRaw?: string) {
  const data = clienteSchema.parse(input);
  const values = {
    ...data,
    nroDoc: data.nroDoc.replace(/\s/g, ""),
    email: data.email?.toLowerCase() ?? null,
    limiteCredito: data.cuentaCorriente ? (data.limiteCredito ?? null) : null,
  };
  try {
    if (idRaw) {
      const id = validarId(idRaw);
      return await db.transaction(async (tx) => {
        const [current] = await tx.select().from(clientes)
          .where(eq(clientes.id, id)).limit(1);
        if (!current) throw new ApiError(404, "NO_ENCONTRADO", "Cliente no encontrado.");
        const [balance] = await tx.select({
          saldo: sql<number>`coalesce(sum(case when ${movimientosCuenta.tipo} = 'debito' then ${movimientosCuenta.importe} else -${movimientosCuenta.importe} end), 0)`,
        }).from(movimientosCuenta).where(eq(movimientosCuenta.clienteId, id));
        const saldo = Number(balance?.saldo ?? 0);
        if (saldo > 0 && !data.cuentaCorriente) {
          throw new ApiError(409, "SALDO_PENDIENTE", "No se puede deshabilitar la cuenta corriente con saldo pendiente.");
        }
        if (saldo > 0 && data.limiteCredito != null && saldo > data.limiteCredito) {
          throw new ApiError(409, "LIMITE_CREDITO_EXCEDIDO", "El límite no puede quedar por debajo del saldo actual.");
        }
        const [updated] = await tx.update(clientes).set(values)
          .where(eq(clientes.id, id)).returning();
        return updated;
      });
    }
    const [created] = await db.insert(clientes).values(values).returning();
    return created;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    return errorDuplicado(error, "documento");
  }
}

export async function cambiarEstadoCliente(idRaw: string, input: unknown) {
  const id = validarId(idRaw);
  const { activo } = estadoSchema.parse(input);
  return db.transaction(async (tx) => {
    if (!activo) {
      const [balance] = await tx.select({
        saldo: sql<number>`coalesce(sum(case when ${movimientosCuenta.tipo} = 'debito' then ${movimientosCuenta.importe} else -${movimientosCuenta.importe} end), 0)`,
      }).from(movimientosCuenta).where(eq(movimientosCuenta.clienteId, id));
      if (Number(balance?.saldo ?? 0) > 0) {
        throw new ApiError(409, "SALDO_PENDIENTE", "No se puede desactivar un cliente con saldo pendiente.");
      }
    }
    const [updated] = await tx.update(clientes).set({ activo })
      .where(eq(clientes.id, id)).returning({ id: clientes.id, activo: clientes.activo });
    if (!updated) throw new ApiError(404, "NO_ENCONTRADO", "Cliente no encontrado.");
    return updated;
  });
}

export async function listarMovimientosCuenta(clienteIdRaw: string) {
  const clienteId = validarId(clienteIdRaw);
  await obtenerCliente(clienteIdRaw);
  return db.select({
    id: movimientosCuenta.id,
    tipo: movimientosCuenta.tipo,
    importe: movimientosCuenta.importe,
    fecha: movimientosCuenta.fecha,
    descripcion: movimientosCuenta.descripcion,
    facturaId: movimientosCuenta.facturaId,
    pagoId: movimientosCuenta.pagoId,
  }).from(movimientosCuenta)
    .where(eq(movimientosCuenta.clienteId, clienteId))
    .orderBy(desc(movimientosCuenta.fecha), desc(movimientosCuenta.id));
}

export async function listarPagosCliente(clienteIdRaw: string) {
  const clienteId = validarId(clienteIdRaw);
  await obtenerCliente(clienteIdRaw);
  return db.select({
    id: pagos.id,
    numeroRecibo: pagos.numeroRecibo,
    fecha: pagos.fecha,
    importe: pagos.importe,
    medio: pagos.medio,
    observacion: pagos.observacion,
    usuario: usuarios.nombre,
  }).from(pagos)
    .innerJoin(usuarios, eq(pagos.usuarioId, usuarios.id))
    .where(eq(pagos.clienteId, clienteId))
    .orderBy(desc(pagos.fecha), desc(pagos.id));
}

export async function registrarPago(
  user: UsuarioSesion,
  clienteIdRaw: string,
  input: unknown,
) {
  const clienteId = validarId(clienteIdRaw);
  const data = pagoSchema.parse(input);
  return db.transaction(async (tx) => {
    const [client] = await tx.select().from(clientes)
      .where(eq(clientes.id, clienteId)).limit(1);
    if (!client) throw new ApiError(404, "NO_ENCONTRADO", "Cliente no encontrado.");
    if (!client.activo) throw new ApiError(409, "VALIDACION", "No se pueden registrar pagos a clientes inactivos.");
    if (!client.cuentaCorriente) {
      throw new ApiError(409, "CUENTA_CORRIENTE_NO_HABILITADA", "El cliente no tiene cuenta corriente habilitada.");
    }
    const [balance] = await tx.select({
      saldo: sql<number>`coalesce(sum(case when ${movimientosCuenta.tipo} = 'debito' then ${movimientosCuenta.importe} else -${movimientosCuenta.importe} end), 0)`,
    }).from(movimientosCuenta).where(eq(movimientosCuenta.clienteId, clienteId));
    const saldo = Number(balance?.saldo ?? 0);
    if (data.importe > saldo) {
      throw new ApiError(422, "PAGO_SUPERA_DEUDA", "El importe supera el saldo pendiente del cliente.");
    }
    const receiptNumbers = await tx.select({ numeroRecibo: pagos.numeroRecibo })
      .from(pagos);
    const numero = receiptNumbers.reduce((maximum, receipt) => {
      const match = /^R 0001-(\d+)$/.exec(receipt.numeroRecibo);
      return match ? Math.max(maximum, Number(match[1])) : maximum;
    }, 0) + 1;
    const fecha = ahoraIsoUtc();
    const [payment] = await tx.insert(pagos).values({
      numeroRecibo: formatearNumeroRecibo(1, numero),
      clienteId,
      usuarioId: user.id,
      fecha,
      importe: data.importe,
      medio: data.medio,
      observacion: data.observacion,
    }).returning();
    await tx.insert(movimientosCuenta).values({
      clienteId,
      tipo: "credito",
      importe: data.importe,
      fecha,
      descripcion: `Pago ${payment.numeroRecibo}`,
      pagoId: payment.id,
    });
    return payment;
  });
}
