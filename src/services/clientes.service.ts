import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { clientes, movimientosCuenta, pagos } from "@/db/schema";
import { ApiError } from "@/lib/errors";
import { ahoraIsoUtc, formatearNumeroRecibo } from "@/lib/format";

type DbReader = Pick<typeof db, "select">;

/** Calcula el saldo actual de un cliente (débitos - créditos) en centavos */
export async function calcularSaldoCliente(
  clienteId: number,
  txOrDb: DbReader = db,
): Promise<number> {
  const [res] = await txOrDb
    .select({
      saldo: sql<number>`coalesce(sum(case when ${movimientosCuenta.tipo} = 'debito' then ${movimientosCuenta.importe} else -${movimientosCuenta.importe} end), 0)`,
    })
    .from(movimientosCuenta)
    .where(eq(movimientosCuenta.clienteId, clienteId));

  return Number(res?.saldo ?? 0);
}

export async function listarClientes(filtros?: {
  q?: string;
  soloCuentaCorriente?: boolean;
  soloActivos?: boolean;
}) {
  const condiciones: SQL[] = [];

  if (filtros?.soloActivos) {
    condiciones.push(eq(clientes.activo, true));
  }
  if (filtros?.soloCuentaCorriente) {
    condiciones.push(eq(clientes.cuentaCorriente, true));
  }
  if (filtros?.q && filtros.q.trim() !== "") {
    const term = `%${filtros.q.trim()}%`;
    const search = or(like(clientes.nombre, term), like(clientes.nroDoc, term));
    if (search) condiciones.push(search);
  }

  const lista = await db
    .select()
    .from(clientes)
    .where(condiciones.length > 0 ? and(...condiciones) : undefined)
    .orderBy(clientes.nombre);

  return Promise.all(
    lista.map(async (cliente) => ({
      ...cliente,
      saldoActual: cliente.cuentaCorriente
        ? await calcularSaldoCliente(cliente.id)
        : 0,
    })),
  );
}

export async function obtenerClienteDetalle(id: number) {
  const [cliente] = await db
    .select()
    .from(clientes)
    .where(eq(clientes.id, id))
    .limit(1);

  if (!cliente) {
    throw new ApiError(404, "NO_ENCONTRADO", "Cliente no encontrado.");
  }

  const saldoActual = await calcularSaldoCliente(id);
  const movimientos = await db
    .select()
    .from(movimientosCuenta)
    .where(eq(movimientosCuenta.clienteId, id))
    .orderBy(desc(movimientosCuenta.id))
    .limit(100);

  return { ...cliente, saldoActual, movimientos };
}

export async function crearCliente(data: {
  tipoDoc: "DNI" | "CUIT";
  nroDoc: string;
  nombre: string;
  domicilio?: string | null;
  telefono?: string | null;
  email?: string | null;
  cuentaCorriente: boolean;
  limiteCredito?: number | null;
}) {
  const [duplicado] = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(eq(clientes.nroDoc, data.nroDoc))
    .limit(1);

  if (duplicado) {
    throw new ApiError(
      409,
      "DOCUMENTO_DUPLICADO",
      `Ya existe un cliente registrado con el documento ${data.nroDoc}.`,
    );
  }

  const [creado] = await db
    .insert(clientes)
    .values({
      tipoDoc: data.tipoDoc,
      nroDoc: data.nroDoc,
      nombre: data.nombre,
      domicilio: data.domicilio || null,
      telefono: data.telefono || null,
      email: data.email || null,
      cuentaCorriente: data.cuentaCorriente,
      limiteCredito: data.cuentaCorriente ? (data.limiteCredito ?? 0) : null,
      activo: true,
    })
    .returning();

  return creado;
}

export async function actualizarCliente(
  id: number,
  data: Partial<{
    tipoDoc: "DNI" | "CUIT";
    nroDoc: string;
    nombre: string;
    domicilio: string | null;
    telefono: string | null;
    email: string | null;
    cuentaCorriente: boolean;
    limiteCredito: number | null;
    activo: boolean;
  }>,
) {
  const [actual] = await db
    .select()
    .from(clientes)
    .where(eq(clientes.id, id))
    .limit(1);

  if (!actual) {
    throw new ApiError(404, "NO_ENCONTRADO", "Cliente no encontrado.");
  }

  if (data.nroDoc && data.nroDoc !== actual.nroDoc) {
    const [duplicado] = await db
      .select({ id: clientes.id })
      .from(clientes)
      .where(eq(clientes.nroDoc, data.nroDoc))
      .limit(1);

    if (duplicado) {
      throw new ApiError(
        409,
        "DOCUMENTO_DUPLICADO",
        `Ya existe otro cliente con el documento ${data.nroDoc}.`,
      );
    }
  }

  const saldo = await calcularSaldoCliente(id);

  if (data.activo === false && saldo > 0) {
    throw new ApiError(
      409,
      "SALDO_PENDIENTE",
      "No se puede desactivar un cliente que tiene deuda pendiente en cuenta corriente.",
    );
  }

  if (data.cuentaCorriente === false && saldo > 0) {
    throw new ApiError(
      409,
      "SALDO_PENDIENTE",
      "No se puede quitar la cuenta corriente mientras el cliente tenga saldo pendiente.",
    );
  }

  const [actualizado] = await db
    .update(clientes)
    .set({
      ...(data.tipoDoc !== undefined ? { tipoDoc: data.tipoDoc } : {}),
      ...(data.nroDoc !== undefined ? { nroDoc: data.nroDoc } : {}),
      ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
      ...(data.domicilio !== undefined
        ? { domicilio: data.domicilio || null }
        : {}),
      ...(data.telefono !== undefined ? { telefono: data.telefono || null } : {}),
      ...(data.email !== undefined ? { email: data.email || null } : {}),
      ...(data.cuentaCorriente !== undefined
        ? { cuentaCorriente: data.cuentaCorriente }
        : {}),
      ...(data.limiteCredito !== undefined
        ? { limiteCredito: data.limiteCredito }
        : {}),
      ...(data.activo !== undefined ? { activo: data.activo } : {}),
    })
    .where(eq(clientes.id, id))
    .returning();

  return actualizado;
}

export async function registrarPagoCuentaCorriente(
  data: {
    clienteId: number;
    importe: number;
    medio: "efectivo" | "transferencia" | "tarjeta_debito";
    observacion?: string | null;
  },
  usuarioId: number,
) {
  return db.transaction(async (tx) => {
    const [cliente] = await tx
      .select()
      .from(clientes)
      .where(eq(clientes.id, data.clienteId))
      .limit(1);

    if (!cliente) {
      throw new ApiError(404, "NO_ENCONTRADO", "Cliente no encontrado.");
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
        usuarioId,
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

    return { pago, nuevoSaldo: saldoActual - data.importe };
  });
}
