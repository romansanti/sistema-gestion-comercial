import { and, asc, desc, eq, gte, inArray, like, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  clientes,
  facturaItems,
  facturas,
  movimientosCuenta,
  movimientosStock,
  productos,
  usuarios,
} from "@/db/schema";
import { ApiError } from "@/lib/errors";
import { ahoraIsoUtc } from "@/lib/format";
import { anularFacturaSchema, facturaSchema } from "@/lib/schemas/operations";
import type { UsuarioSesion } from "@/lib/session";
import { exigirAdmin, validarId } from "./common.service";

const TZ_AR = "America/Argentina/Buenos_Aires";

function fechaLocal(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_AR,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function fechaHoraLocal(date: Date): { date: string; month: string } {
  const day = fechaLocal(date);
  return { date: day, month: day.slice(0, 7) };
}

function limiteFechaLocal(value: string, final: boolean): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ApiError(422, "VALIDACION", "La fecha del filtro no es válida.");
  }
  const date = new Date(`${value}T${final ? "23:59:59.999" : "00:00:00.000"}-03:00`);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(422, "VALIDACION", "La fecha del filtro no es válida.");
  }
  return date.toISOString();
}

export async function listarFacturas(filters: {
  q?: string | null;
  desde?: string | null;
  hasta?: string | null;
  formaPago?: string | null;
  estado?: string | null;
  clienteId?: string | null;
  usuarioId?: string | null;
}) {
  const conditions = [];
  if (filters.q?.trim()) {
    const q = `%${filters.q.trim()}%`;
    conditions.push(or(like(clientes.nombre, q), like(sql`cast(${facturas.numero} as text)`, q))!);
  }
  if (filters.desde) {
    conditions.push(gte(facturas.fecha, limiteFechaLocal(filters.desde, false)));
  }
  if (filters.hasta) {
    conditions.push(lte(facturas.fecha, limiteFechaLocal(filters.hasta, true)));
  }
  if (filters.formaPago && ["contado", "tarjeta", "cuenta_corriente"].includes(filters.formaPago)) {
    conditions.push(eq(facturas.formaPago, filters.formaPago as "contado" | "tarjeta" | "cuenta_corriente"));
  }
  if (filters.estado && ["emitida", "anulada"].includes(filters.estado)) {
    conditions.push(eq(facturas.estado, filters.estado as "emitida" | "anulada"));
  }
  if (filters.clienteId && Number.isSafeInteger(Number(filters.clienteId))) {
    conditions.push(eq(facturas.clienteId, Number(filters.clienteId)));
  }
  if (filters.usuarioId && Number.isSafeInteger(Number(filters.usuarioId))) {
    conditions.push(eq(facturas.usuarioId, Number(filters.usuarioId)));
  }
  const rows = await db.select({
    id: facturas.id,
    puntoVenta: facturas.puntoVenta,
    numero: facturas.numero,
    fecha: facturas.fecha,
    clienteId: facturas.clienteId,
    cliente: clientes.nombre,
    usuarioId: facturas.usuarioId,
    usuario: usuarios.nombre,
    total: facturas.total,
    formaPago: facturas.formaPago,
    estado: facturas.estado,
    createdAt: facturas.createdAt,
  }).from(facturas)
    .leftJoin(clientes, eq(facturas.clienteId, clientes.id))
    .innerJoin(usuarios, eq(facturas.usuarioId, usuarios.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(facturas.fecha), desc(facturas.id));
  const emitidas = rows.filter((invoice) => invoice.estado === "emitida");
  return {
    items: rows,
    totalEmitido: emitidas.reduce((sum, invoice) => sum + invoice.total, 0),
    cantidad: rows.length,
  };
}

export async function crearFactura(user: UsuarioSesion, input: unknown) {
  const data = facturaSchema.parse(input);
  if (data.formaPago === "contado" && data.montoRecibido === undefined) {
    throw new ApiError(422, "VALIDACION", "Ingresá el monto recibido para el pago en efectivo.");
  }
  if (data.formaPago === "tarjeta" && (!data.tarjetaTipo || !data.tarjetaMarca || !data.tarjetaUltimos4)) {
    throw new ApiError(422, "VALIDACION", "Completá tipo, marca y últimos cuatro dígitos de la tarjeta.");
  }

  return db.transaction(async (tx) => {
    const productIds = [...new Set(data.items.map((item) => item.productoId))];
    const selectedProducts = await tx.select().from(productos)
      .where(inArray(productos.id, productIds));
    const productById = new Map(selectedProducts.map((product) => [product.id, product]));
    const quantities = new Map<number, number>();
    for (const item of data.items) {
      quantities.set(item.productoId, (quantities.get(item.productoId) ?? 0) + item.cantidad);
    }

    for (const [productId, quantity] of quantities) {
      const product = productById.get(productId);
      if (!product) throw new ApiError(404, "NO_ENCONTRADO", `No se encontró el producto ${productId}.`);
      if (!product.activo) throw new ApiError(409, "PRODUCTO_INACTIVO", `${product.descripcion} está inactivo.`);
      if (product.existencia < quantity) {
        throw new ApiError(409, "STOCK_INSUFICIENTE", `Stock insuficiente para ${product.descripcion}.`);
      }
    }

    let client: typeof clientes.$inferSelect | undefined;
    if (data.clienteId) {
      [client] = await tx.select().from(clientes)
        .where(eq(clientes.id, data.clienteId)).limit(1);
      if (!client || !client.activo) throw new ApiError(404, "NO_ENCONTRADO", "Cliente no encontrado o inactivo.");
    }
    const items = data.items.map((item) => {
      const product = productById.get(item.productoId)!;
      return {
        productoId: product.id,
        descripcion: product.descripcion,
        cantidad: item.cantidad,
        precioUnitario: product.precio,
        subtotal: product.precio * item.cantidad,
      };
    });
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);
    if (!Number.isSafeInteger(total)) throw new ApiError(422, "VALIDACION", "El total de la factura excede el máximo permitido.");
    if (data.formaPago === "contado" && data.montoRecibido! < total) {
      throw new ApiError(422, "MONTO_INSUFICIENTE", "El monto recibido no alcanza para cubrir el total.");
    }
    if (data.formaPago === "cuenta_corriente") {
      if (!client || !client.cuentaCorriente) {
        throw new ApiError(422, "CUENTA_CORRIENTE_NO_HABILITADA", "El cliente no tiene cuenta corriente habilitada.");
      }
      const [balance] = await tx.select({
        saldo: sql<number>`coalesce(sum(case when ${movimientosCuenta.tipo} = 'debito' then ${movimientosCuenta.importe} else -${movimientosCuenta.importe} end), 0)`,
      }).from(movimientosCuenta).where(eq(movimientosCuenta.clienteId, client.id));
      const saldo = Number(balance?.saldo ?? 0);
      if (client.limiteCredito !== null && saldo + total > client.limiteCredito) {
        throw new ApiError(422, "LIMITE_CREDITO_EXCEDIDO", "La operación supera el límite de crédito disponible.");
      }
    }

    const [maxNumber] = await tx.select({
      value: sql<number>`coalesce(max(${facturas.numero}), 0)`,
    }).from(facturas);
    const numero = Number(maxNumber?.value ?? 0) + 1;
    const fecha = ahoraIsoUtc();
    const [invoice] = await tx.insert(facturas).values({
      numero,
      fecha,
      clienteId: client?.id ?? null,
      usuarioId: user.id,
      total,
      formaPago: data.formaPago,
      montoRecibido: data.formaPago === "contado" ? data.montoRecibido : null,
      tarjetaTipo: data.formaPago === "tarjeta" ? data.tarjetaTipo : null,
      tarjetaMarca: data.formaPago === "tarjeta" ? data.tarjetaMarca : null,
      tarjetaUltimos4: data.formaPago === "tarjeta" ? data.tarjetaUltimos4 : null,
    }).returning();
    await tx.insert(facturaItems).values(items.map((item) => ({ ...item, facturaId: invoice.id })));

    for (const [productId, quantity] of quantities) {
      const product = productById.get(productId)!;
      const existencia = product.existencia - quantity;
      await tx.update(productos).set({ existencia }).where(eq(productos.id, productId));
      await tx.insert(movimientosStock).values({
        productoId: productId,
        tipo: "venta",
        cantidad: -quantity,
        existenciaResultante: existencia,
        motivo: "Venta",
        facturaId: invoice.id,
        usuarioId: user.id,
        fecha,
      });
    }
    if (data.formaPago === "cuenta_corriente" && client) {
      await tx.insert(movimientosCuenta).values({
        clienteId: client.id,
        tipo: "debito",
        importe: total,
        fecha,
        descripcion: `Factura ${String(invoice.numero).padStart(8, "0")}`,
        facturaId: invoice.id,
      });
    }
    return { ...invoice, items };
  });
}

export async function obtenerFactura(idRaw: string) {
  const id = validarId(idRaw);
  const [invoice] = await db.select({
    id: facturas.id,
    puntoVenta: facturas.puntoVenta,
    numero: facturas.numero,
    fecha: facturas.fecha,
    clienteId: facturas.clienteId,
    cliente: clientes.nombre,
    tipoDoc: clientes.tipoDoc,
    nroDoc: clientes.nroDoc,
    domicilio: clientes.domicilio,
    usuarioId: facturas.usuarioId,
    usuario: usuarios.nombre,
    total: facturas.total,
    formaPago: facturas.formaPago,
    montoRecibido: facturas.montoRecibido,
    tarjetaTipo: facturas.tarjetaTipo,
    tarjetaMarca: facturas.tarjetaMarca,
    tarjetaUltimos4: facturas.tarjetaUltimos4,
    estado: facturas.estado,
    motivoAnulacion: facturas.motivoAnulacion,
    fechaAnulacion: facturas.fechaAnulacion,
    createdAt: facturas.createdAt,
  }).from(facturas)
    .leftJoin(clientes, eq(facturas.clienteId, clientes.id))
    .innerJoin(usuarios, eq(facturas.usuarioId, usuarios.id))
    .where(eq(facturas.id, id)).limit(1);
  if (!invoice) throw new ApiError(404, "NO_ENCONTRADO", "Factura no encontrada.");
  const items = await db.select().from(facturaItems)
    .where(eq(facturaItems.facturaId, id)).orderBy(asc(facturaItems.id));
  return { ...invoice, items };
}

export async function anularFactura(
  user: UsuarioSesion,
  idRaw: string,
  input: unknown,
) {
  exigirAdmin(user);
  const id = validarId(idRaw);
  const { motivoAnulacion } = anularFacturaSchema.parse(input);
  return db.transaction(async (tx) => {
    const [invoice] = await tx.select().from(facturas)
      .where(eq(facturas.id, id)).limit(1);
    if (!invoice) throw new ApiError(404, "NO_ENCONTRADO", "Factura no encontrada.");
    if (invoice.estado !== "emitida") {
      throw new ApiError(409, "FACTURA_ANULADA", "La factura ya está anulada.");
    }
    const items = await tx.select().from(facturaItems)
      .where(eq(facturaItems.facturaId, id));
    const fechaAnulacion = ahoraIsoUtc();
    await tx.update(facturas).set({
      estado: "anulada",
      motivoAnulacion,
      fechaAnulacion,
      usuarioAnulacionId: user.id,
    }).where(eq(facturas.id, id));

    const quantityByProduct = new Map<number, number>();
    for (const item of items) {
      quantityByProduct.set(item.productoId, (quantityByProduct.get(item.productoId) ?? 0) + item.cantidad);
    }
    for (const [productId, quantity] of quantityByProduct) {
      const [product] = await tx.select().from(productos)
        .where(eq(productos.id, productId)).limit(1);
      if (!product) throw new ApiError(404, "NO_ENCONTRADO", "Producto asociado a la factura no encontrado.");
      const existencia = product.existencia + quantity;
      await tx.update(productos).set({ existencia }).where(eq(productos.id, productId));
      await tx.insert(movimientosStock).values({
        productoId: productId,
        tipo: "anulacion",
        cantidad: quantity,
        existenciaResultante: existencia,
        motivo: `Anulación de factura ${String(invoice.numero).padStart(8, "0")}`,
        facturaId: invoice.id,
        usuarioId: user.id,
        fecha: fechaAnulacion,
      });
    }
    if (invoice.formaPago === "cuenta_corriente" && invoice.clienteId) {
      await tx.insert(movimientosCuenta).values({
        clienteId: invoice.clienteId,
        tipo: "credito",
        importe: invoice.total,
        fecha: fechaAnulacion,
        descripcion: `Anulación de factura ${String(invoice.numero).padStart(8, "0")}`,
        facturaId: invoice.id,
      });
    }
    return { id: invoice.id, estado: "anulada", motivoAnulacion, fechaAnulacion };
  });
}

export async function obtenerDashboard() {
  const invoices = await db.select({
    fecha: facturas.fecha,
    total: facturas.total,
    formaPago: facturas.formaPago,
    estado: facturas.estado,
    clienteId: facturas.clienteId,
  }).from(facturas);
  const today = fechaLocal(new Date());
  const month = today.slice(0, 7);
  const emitted = invoices.filter((invoice) => invoice.estado === "emitida");
  const todaySales = emitted.filter((invoice) => fechaHoraLocal(new Date(invoice.fecha)).date === today);
  const monthSales = emitted.filter((invoice) => fechaHoraLocal(new Date(invoice.fecha)).month === month);
  const salesByPayment = {
    contado: monthSales.filter((invoice) => invoice.formaPago === "contado").reduce((sum, invoice) => sum + invoice.total, 0),
    tarjeta: monthSales.filter((invoice) => invoice.formaPago === "tarjeta").reduce((sum, invoice) => sum + invoice.total, 0),
    cuenta_corriente: monthSales.filter((invoice) => invoice.formaPago === "cuenta_corriente").reduce((sum, invoice) => sum + invoice.total, 0),
  };
  const lowStock = await db.select({ count: sql<number>`count(*)` })
    .from(productos)
    .where(and(eq(productos.activo, true), lte(productos.existencia, productos.stockMinimo)));
  const balances = await db.select({
    clienteId: movimientosCuenta.clienteId,
    saldo: sql<number>`sum(case when ${movimientosCuenta.tipo} = 'debito' then ${movimientosCuenta.importe} else -${movimientosCuenta.importe} end)`,
  }).from(movimientosCuenta).groupBy(movimientosCuenta.clienteId);
  const positiveBalances = balances.filter((balance) => Number(balance.saldo) > 0);
  const daily: { fecha: string; total: number }[] = [];
  const now = new Date();
  for (let offset = 29; offset >= 0; offset--) {
    const date = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000);
    const dateKey = fechaLocal(date);
    daily.push({
      fecha: dateKey,
      total: emitted.filter((invoice) => fechaLocal(new Date(invoice.fecha)) === dateKey)
        .reduce((sum, invoice) => sum + invoice.total, 0),
    });
  }
  return {
    ventasHoy: {
      total: todaySales.reduce((sum, invoice) => sum + invoice.total, 0),
      cantidad: todaySales.length,
    },
    ventasMes: {
      total: monthSales.reduce((sum, invoice) => sum + invoice.total, 0),
      cantidad: monthSales.length,
      ticketPromedio: monthSales.length
        ? Math.round(monthSales.reduce((sum, invoice) => sum + invoice.total, 0) / monthSales.length)
        : 0,
    },
    cuentasCorrientes: {
      saldoTotal: positiveBalances.reduce((sum, balance) => sum + Number(balance.saldo), 0),
      clientesConSaldo: positiveBalances.length,
    },
    productosBajoMinimo: Number(lowStock[0]?.count ?? 0),
    ventasUltimos30Dias: daily,
    ventasMesPorFormaPago: salesByPayment,
  };
}
