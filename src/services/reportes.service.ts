import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  categorias,
  clientes,
  facturaItems,
  facturas,
  productos,
} from "@/db/schema";
import { ApiError } from "@/lib/errors";
import { reporteVentasSchema } from "@/lib/schemas/reportes";
import type { UsuarioSesion } from "@/lib/session";
import { obtenerSaldosClientes } from "./clientes.service";

const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

function fechaLocal(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function inicioDiaUtc(fecha: string): string {
  return new Date(`${fecha}T00:00:00-03:00`).toISOString();
}

function diaSiguiente(fecha: string): string {
  const siguiente = new Date(`${fecha}T00:00:00Z`);
  siguiente.setUTCDate(siguiente.getUTCDate() + 1);
  return siguiente.toISOString().slice(0, 10);
}

/** RF-R1: Genera reportes de ventas; el acceso está limitado a administración. */
export async function obtenerReporteVentas(usuario: UsuarioSesion, input: unknown) {
  const filtros = reporteVentasSchema.parse(input);
  if (usuario.rol !== "admin") {
    throw new ApiError(
      403,
      "SIN_PERMISO",
      "Esta acción requiere permisos de administrador.",
    );
  }

  const hoy = fechaLocal(new Date());
  const haceTreintaDias = new Date();
  haceTreintaDias.setUTCDate(haceTreintaDias.getUTCDate() - 29);
  const desde = filtros.desde ?? fechaLocal(haceTreintaDias);
  const hasta = filtros.hasta ?? hoy;
  const condiciones = and(
    eq(facturas.estado, "emitida"),
    gte(facturas.fecha, inicioDiaUtc(desde)),
    lt(facturas.fecha, inicioDiaUtc(diaSiguiente(hasta))),
  );

  const [resumen] = await db
    .select({
      cantidad: sql<number>`count(*)`,
      total: sql<number>`coalesce(sum(${facturas.total}), 0)`,
    })
    .from(facturas)
    .where(condiciones);

  const ventasPorMedio = await db
    .select({
      medio: facturas.formaPago,
      cantidad: sql<number>`count(*)`,
      total: sql<number>`coalesce(sum(${facturas.total}), 0)`,
    })
    .from(facturas)
    .where(condiciones)
    .groupBy(facturas.formaPago);

  const productosMasVendidos = await db
    .select({
      productoId: productos.id,
      codigo: productos.codigo,
      descripcion: facturaItems.descripcion,
      cantidad: sql<number>`coalesce(sum(${facturaItems.cantidad}), 0)`,
      total: sql<number>`coalesce(sum(${facturaItems.subtotal}), 0)`,
    })
    .from(facturaItems)
    .innerJoin(facturas, eq(facturaItems.facturaId, facturas.id))
    .innerJoin(productos, eq(facturaItems.productoId, productos.id))
    .where(condiciones)
    .groupBy(productos.id, productos.codigo, facturaItems.descripcion)
    .orderBy(desc(sql`sum(${facturaItems.cantidad})`))
    .limit(5);

  const stockCritico = await db
    .select({
      id: productos.id,
      codigo: productos.codigo,
      descripcion: productos.descripcion,
      existencia: productos.existencia,
      stockMinimo: productos.stockMinimo,
      categoria: categorias.nombre,
    })
    .from(productos)
    .innerJoin(categorias, eq(productos.categoriaId, categorias.id))
    .where(
      and(
        eq(productos.activo, true),
        sql`${productos.existencia} <= ${productos.stockMinimo}`,
      ),
    )
    .orderBy(
      sql`(${productos.existencia} - ${productos.stockMinimo})`,
      productos.descripcion,
    )
    .limit(10);

  const clientesCredito = await db
    .select({
      id: clientes.id,
      nombre: clientes.nombre,
      documento: clientes.nroDoc,
      limiteCredito: clientes.limiteCredito,
    })
    .from(clientes)
    .where(
      and(
        eq(clientes.activo, true),
        eq(clientes.cuentaCorriente, true),
      ),
    );
  const saldos = await obtenerSaldosClientes(
    clientesCredito.map((cliente) => cliente.id),
  );
  const clientesConSaldo = clientesCredito
    .map((cliente) => ({
      ...cliente,
      saldoActual: saldos.get(cliente.id) ?? 0,
    }))
    .filter((cliente) => cliente.saldoActual > 0)
    .sort((a, b) => b.saldoActual - a.saldoActual);
  const deudores = clientesConSaldo.slice(0, 10);

  const cantidadVentas = Number(resumen?.cantidad ?? 0);
  const totalVentas = Number(resumen?.total ?? 0);
  return {
    periodo: { desde, hasta },
    resumen: {
      cantidadVentas,
      totalVentas,
      ticketPromedio:
        cantidadVentas === 0 ? 0 : Math.round(totalVentas / cantidadVentas),
      deudaTotal: clientesConSaldo.reduce(
        (total, cliente) => total + cliente.saldoActual,
        0,
      ),
    },
    ventasPorMedio,
    productosMasVendidos,
    stockCritico,
    deudores,
  };
}

const tableroInputSchema = z.object({}).strict();

/** RF-T1: Provee indicadores y alertas del tablero a todo usuario autenticado. */
export async function obtenerResumenTablero(
  _usuario: UsuarioSesion,
  input: unknown,
) {
  tableroInputSchema.parse(input);
  const hoy = fechaLocal(new Date());
  const inicioMes = `${hoy.slice(0, 7)}-01`;
  const fechaInicio = new Date(`${hoy}T00:00:00-03:00`);
  fechaInicio.setUTCDate(fechaInicio.getUTCDate() - 29);
  const desdeTreintaDias = fechaLocal(fechaInicio);

  const [
    ventasHoy,
    ventasMes,
    ventasTreintaDias,
    ventasPorFormaPago,
    productosMasVendidos,
    stockCritico,
    stockCriticoCantidad,
    ultimasFacturas,
    clientesCredito,
  ] =
    await Promise.all([
      db
        .select({
          cantidad: sql<number>`count(*)`,
          total: sql<number>`coalesce(sum(${facturas.total}), 0)`,
        })
        .from(facturas)
        .where(
          and(
            eq(facturas.estado, "emitida"),
            gte(facturas.fecha, inicioDiaUtc(hoy)),
            lt(facturas.fecha, inicioDiaUtc(diaSiguiente(hoy))),
          ),
        ),
      db
        .select({
          cantidad: sql<number>`count(*)`,
          total: sql<number>`coalesce(sum(${facturas.total}), 0)`,
        })
        .from(facturas)
        .where(
          and(
            eq(facturas.estado, "emitida"),
            gte(facturas.fecha, inicioDiaUtc(inicioMes)),
            lt(facturas.fecha, inicioDiaUtc(diaSiguiente(hoy))),
          ),
        ),
      db
        .select({
          fecha: sql<string>`date(${facturas.fecha}, '-3 hours')`,
          total: sql<number>`coalesce(sum(${facturas.total}), 0)`,
        })
        .from(facturas)
        .where(
          and(
            eq(facturas.estado, "emitida"),
            gte(facturas.fecha, inicioDiaUtc(desdeTreintaDias)),
            lt(facturas.fecha, inicioDiaUtc(diaSiguiente(hoy))),
          ),
        )
        .groupBy(sql`date(${facturas.fecha}, '-3 hours')`)
        .orderBy(sql`date(${facturas.fecha}, '-3 hours')`),
      db
        .select({
          formaPago: facturas.formaPago,
          cantidad: sql<number>`count(*)`,
          total: sql<number>`coalesce(sum(${facturas.total}), 0)`,
        })
        .from(facturas)
        .where(
          and(
            eq(facturas.estado, "emitida"),
            gte(facturas.fecha, inicioDiaUtc(desdeTreintaDias)),
            lt(facturas.fecha, inicioDiaUtc(diaSiguiente(hoy))),
          ),
        )
        .groupBy(facturas.formaPago),
      db
        .select({
          productoId: productos.id,
          codigo: productos.codigo,
          descripcion: facturaItems.descripcion,
          cantidad: sql<number>`coalesce(sum(${facturaItems.cantidad}), 0)`,
          total: sql<number>`coalesce(sum(${facturaItems.subtotal}), 0)`,
        })
        .from(facturaItems)
        .innerJoin(facturas, eq(facturaItems.facturaId, facturas.id))
        .innerJoin(productos, eq(facturaItems.productoId, productos.id))
        .where(
          and(
            eq(facturas.estado, "emitida"),
            gte(facturas.fecha, inicioDiaUtc(desdeTreintaDias)),
            lt(facturas.fecha, inicioDiaUtc(diaSiguiente(hoy))),
          ),
        )
        .groupBy(productos.id, productos.codigo, facturaItems.descripcion)
        .orderBy(desc(sql`sum(${facturaItems.cantidad})`))
        .limit(5),
      db
        .select({
          id: productos.id,
          codigo: productos.codigo,
          descripcion: productos.descripcion,
          existencia: productos.existencia,
          stockMinimo: productos.stockMinimo,
        })
        .from(productos)
        .where(
          and(
            eq(productos.activo, true),
            sql`${productos.existencia} <= ${productos.stockMinimo}`,
          ),
        )
        .orderBy(sql`(${productos.existencia} - ${productos.stockMinimo})`)
        .limit(6),
      db
        .select({ cantidad: sql<number>`count(*)` })
        .from(productos)
        .where(
          and(
            eq(productos.activo, true),
            sql`${productos.existencia} <= ${productos.stockMinimo}`,
          ),
        ),
      db
        .select({
          id: facturas.id,
          puntoVenta: facturas.puntoVenta,
          numero: facturas.numero,
          fecha: facturas.fecha,
          clienteNombre: clientes.nombre,
          total: facturas.total,
          formaPago: facturas.formaPago,
          estado: facturas.estado,
        })
        .from(facturas)
        .leftJoin(clientes, eq(facturas.clienteId, clientes.id))
        .where(eq(facturas.estado, "emitida"))
        .orderBy(desc(facturas.id))
        .limit(6),
      db
        .select({
          id: clientes.id,
          nombre: clientes.nombre,
          documento: clientes.nroDoc,
          limiteCredito: clientes.limiteCredito,
        })
        .from(clientes)
        .where(
          and(
            eq(clientes.activo, true),
            eq(clientes.cuentaCorriente, true),
          ),
        ),
    ]);

  const saldos = await obtenerSaldosClientes(
    clientesCredito.map((cliente) => cliente.id),
  );
  const deudores = clientesCredito
    .map((cliente) => ({
      ...cliente,
      saldoActual: saldos.get(cliente.id) ?? 0,
    }))
    .filter((cliente) => cliente.saldoActual > 0)
    .sort((a, b) => b.saldoActual - a.saldoActual)
  const saldoTotal = deudores.reduce(
    (total, cliente) => total + cliente.saldoActual,
    0,
  );
  const clientesConSaldo = deudores.length;

  const dias = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(`${desdeTreintaDias}T00:00:00-03:00`);
    date.setUTCDate(date.getUTCDate() + index);
    return fechaLocal(date);
  });
  const ventasPorDia = dias.map((fecha) => ({
    fecha,
    total: Number(
      ventasTreintaDias.find((venta) => venta.fecha === fecha)?.total ?? 0,
    ),
  }));
  const [hoyData] = ventasHoy;
  const [mesData] = ventasMes;

  return {
    fecha: hoy,
    ventasHoy: {
      cantidad: Number(hoyData?.cantidad ?? 0),
      total: Number(hoyData?.total ?? 0),
    },
    ventasMes: {
      cantidad: Number(mesData?.cantidad ?? 0),
      total: Number(mesData?.total ?? 0),
    },
    deudaTotal: saldoTotal,
    clientesConSaldo,
    stockCriticoCantidad: Number(stockCriticoCantidad[0]?.cantidad ?? 0),
    ventasPorDia,
    ventasPorFormaPago,
    productosMasVendidos,
    stockCritico,
    ultimasFacturas,
    deudores: deudores.slice(0, 6),
  };
}
