import {
  and,
  asc,
  desc,
  eq,
  inArray,
  like,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import {
  clientes,
  facturas,
  movimientosCuenta,
} from "@/db/schema";
import { ApiError } from "@/lib/errors";
import { ahoraIsoUtc } from "@/lib/format";
import {
  actualizarClienteSchema,
  clienteIdSchema,
  cuentaClienteSchema,
  crearClienteSchema,
  listarClientesSchema,
} from "@/lib/schemas/clientes";
import type { UsuarioSesion } from "@/lib/session";

type DbReader = Pick<typeof db, "select">;

/** RF-CC1: Calcula saldo únicamente desde movimientos débito/crédito. */
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

/** RF-CC1: Agrupa los saldos derivados de movimientos para varios clientes. */
export async function obtenerSaldosClientes(
  clienteIds?: number[],
): Promise<Map<number, number>> {
  if (clienteIds?.length === 0) return new Map();

  const filas = await db
    .select({
      clienteId: movimientosCuenta.clienteId,
      saldo: sql<number>`coalesce(sum(case when ${movimientosCuenta.tipo} = 'debito' then ${movimientosCuenta.importe} else -${movimientosCuenta.importe} end), 0)`,
    })
    .from(movimientosCuenta)
    .where(
      clienteIds?.length
        ? inArray(movimientosCuenta.clienteId, clienteIds)
        : undefined,
    )
    .groupBy(movimientosCuenta.clienteId);

  return new Map(filas.map((fila) => [fila.clienteId, Number(fila.saldo)]));
}

function normalizarDocumento(value: string): string {
  return value.replace(/[.\-\s]/g, "").toLowerCase();
}

function fechaLocalIso(isoUtc: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoUtc));
}

function exigirAdmin(usuario: UsuarioSesion): void {
  if (usuario.rol !== "admin") {
    throw new ApiError(
      403,
      "SIN_PERMISO",
      "Esta acción requiere permisos de administrador.",
    );
  }
}

/** RF-CC2: Lista clientes con búsqueda normalizada, deuda y paginación. */
export async function listarClientes(_usuario: UsuarioSesion, input: unknown) {
  const filtros = listarClientesSchema.parse(input);
  const condiciones: SQL[] = [];

  const cuentaCorriente = filtros.cuentaCorriente;
  const activo = filtros.activo ?? filtros.activos;
  if (cuentaCorriente !== undefined) {
    condiciones.push(eq(clientes.cuentaCorriente, cuentaCorriente));
  }
  if (activo !== undefined) condiciones.push(eq(clientes.activo, activo));
  if (filtros.q) {
    const rawTerm = filtros.q.trim();
    const term = `%${rawTerm}%`;
    const documentoNormalizado = normalizarDocumento(rawTerm);
    const search = documentoNormalizado
      ? or(
          like(clientes.nombre, term),
          sql`lower(replace(replace(replace(${clientes.nroDoc}, '.', ''), '-', ''), ' ', '')) like ${`%${documentoNormalizado}%`}`,
        )
      : like(clientes.nombre, term);
    if (search) condiciones.push(search);
  }

  const rows = await db
    .select()
    .from(clientes)
    .where(condiciones.length ? and(...condiciones) : undefined);
  const saldos = await obtenerSaldosClientes(rows.map((cliente) => cliente.id));
  const withBalances = rows.map((cliente) => ({
    ...cliente,
    saldoActual: saldos.get(cliente.id) ?? 0,
  }));
  const filtered = withBalances.filter(
    (cliente) => !filtros.conDeuda || cliente.saldoActual > 0,
  );
  filtered.sort((a, b) =>
    filtros.ordenar === "saldo"
      ? b.saldoActual - a.saldoActual || a.nombre.localeCompare(b.nombre, "es")
      : a.nombre.localeCompare(b.nombre, "es"),
  );

  const offset = (filtros.page - 1) * filtros.pageSize;
  const total = filtered.length;
  return {
    items: filtered.slice(offset, offset + filtros.pageSize),
    pagination: {
      page: filtros.page,
      pageSize: filtros.pageSize,
      total,
      totalPages: Math.ceil(total / filtros.pageSize),
    },
    totalAdeudado: filtered.reduce(
      (sum, cliente) => sum + Math.max(cliente.saldoActual, 0),
      0,
    ),
    creditoDisponibleTotal: filtered.reduce(
      (sum, cliente) =>
        sum +
        (cliente.cuentaCorriente
          ? Math.max(
              0,
              (cliente.limiteCredito ?? 0) - Math.max(cliente.saldoActual, 0),
            )
          : 0),
      0,
    ),
  };
}

/** RF-CC3: Obtiene ficha, saldo derivado y últimas facturas del cliente. */
export async function obtenerClienteDetalle(
  _usuario: UsuarioSesion,
  input: unknown,
) {
  const { id } = clienteIdSchema.parse(input);
  const [cliente] = await db
    .select()
    .from(clientes)
    .where(eq(clientes.id, id))
    .limit(1);

  if (!cliente) {
    throw new ApiError(404, "NO_ENCONTRADO", "Cliente no encontrado.");
  }

  const saldoActual = await calcularSaldoCliente(id);
  const ultimasFacturas = await db
    .select({
      id: facturas.id,
      puntoVenta: facturas.puntoVenta,
      numero: facturas.numero,
      fecha: facturas.fecha,
      total: facturas.total,
      formaPago: facturas.formaPago,
      estado: facturas.estado,
    })
    .from(facturas)
    .where(eq(facturas.clienteId, id))
    .orderBy(desc(facturas.id))
    .limit(10);

  return { ...cliente, saldoActual, ultimasFacturas };
}

/** RF-CC4: Registra un cliente sin borrar su historial comercial. */
export async function crearCliente(_usuario: UsuarioSesion, input: unknown) {
  const data = crearClienteSchema.parse(input);
  const [duplicado] = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(
      sql`lower(replace(replace(replace(${clientes.nroDoc}, '.', ''), '-', ''), ' ', '')) = ${normalizarDocumento(data.nroDoc)}`,
    )
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

/** RF-CC5: Actualiza o desactiva clientes; bloquea bajas con saldo pendiente. */
export async function actualizarCliente(
  usuario: UsuarioSesion,
  input: unknown,
) {
  const { id, cambios } = actualizarClienteSchema.parse(input);
  exigirAdmin(usuario);

  const [actual] = await db
    .select()
    .from(clientes)
    .where(eq(clientes.id, id))
    .limit(1);

  if (!actual) {
    throw new ApiError(404, "NO_ENCONTRADO", "Cliente no encontrado.");
  }

  if (cambios.nroDoc && cambios.nroDoc !== actual.nroDoc) {
    const [duplicado] = await db
      .select({ id: clientes.id })
      .from(clientes)
      .where(
        and(
          sql`lower(replace(replace(replace(${clientes.nroDoc}, '.', ''), '-', ''), ' ', '')) = ${normalizarDocumento(cambios.nroDoc)}`,
          ne(clientes.id, id),
        ),
      )
      .limit(1);
    if (duplicado) {
      throw new ApiError(
        409,
        "DOCUMENTO_DUPLICADO",
        `Ya existe otro cliente con el documento ${cambios.nroDoc}.`,
      );
    }
  }

  const saldo = await calcularSaldoCliente(id);
  if (
    saldo !== 0 &&
    (cambios.activo === false || cambios.cuentaCorriente === false)
  ) {
    throw new ApiError(
      422,
      "SALDO_PENDIENTE",
      "No se puede desactivar al cliente ni quitar su cuenta corriente mientras tenga saldo pendiente.",
    );
  }

  const cuentaCorriente =
    cambios.cuentaCorriente ?? actual.cuentaCorriente;
  const [actualizado] = await db
    .update(clientes)
    .set({
      ...cambios,
      limiteCredito: cuentaCorriente
        ? (cambios.limiteCredito ?? actual.limiteCredito ?? 0)
        : null,
    })
    .where(eq(clientes.id, id))
    .returning();

  return actualizado;
}

/** RF-CC6: Devuelve el mayor y saldo acumulado de cada movimiento cronológico. */
export async function obtenerCuentaCliente(
  _usuario: UsuarioSesion,
  input: unknown,
) {
  const filtros = cuentaClienteSchema.parse(input);
  const [cliente] = await db
    .select({ id: clientes.id, nombre: clientes.nombre })
    .from(clientes)
    .where(eq(clientes.id, filtros.id))
    .limit(1);

  if (!cliente) {
    throw new ApiError(404, "NO_ENCONTRADO", "Cliente no encontrado.");
  }

  const movimientos = await db
    .select()
    .from(movimientosCuenta)
    .where(eq(movimientosCuenta.clienteId, filtros.id))
    .orderBy(asc(movimientosCuenta.fecha), asc(movimientosCuenta.id));

  let saldoAcumulado = 0;
  const libro = movimientos.map((movimiento) => {
    const saldoAnterior = saldoAcumulado;
    saldoAcumulado +=
      movimiento.tipo === "debito" ? movimiento.importe : -movimiento.importe;
    return { ...movimiento, saldoAnterior, saldoAcumulado };
  });
  const filtrados = libro.filter((movimiento) => {
    const fecha = fechaLocalIso(movimiento.fecha);
    return (
      (!filtros.desde || fecha >= filtros.desde) &&
      (!filtros.hasta || fecha <= filtros.hasta)
    );
  });

  return { cliente, saldoActual: saldoAcumulado, movimientos: filtrados };
}

