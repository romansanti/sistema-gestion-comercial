import { and, desc, eq, gte, lt, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  clientes,
  facturaItems,
  facturas,
  movimientosCuenta,
  productos,
  usuarios,
} from "@/db/schema";
import { ApiError } from "@/lib/errors";
import { ahoraIsoUtc, formatearNumeroFactura } from "@/lib/format";
import {
  anularFacturaInputSchema,
  crearFacturaSchema,
  facturaIdSchema,
  listarFacturasSchema,
} from "@/lib/schemas/facturas";
import type { UsuarioSesion } from "@/lib/session";
import { calcularSaldoCliente } from "./clientes.service";
import { moverStock } from "./stock.service";

const PUNTO_VENTA_ACTUAL = 1;

function inicioDiaUtc(fecha: string): string {
  return new Date(`${fecha}T00:00:00-03:00`).toISOString();
}

/** RF-V1: Lista facturas aplicando filtros validados y paginación. */
export async function listarFacturas(
  _usuario: UsuarioSesion,
  input: unknown,
) {
  const filtros = listarFacturasSchema.parse(input);
  const condiciones: SQL[] = [];
  if (filtros.estado) {
    condiciones.push(eq(facturas.estado, filtros.estado));
  }
  if (filtros.clienteId !== undefined) {
    condiciones.push(eq(facturas.clienteId, filtros.clienteId));
  }
  if (filtros.formaPago) {
    condiciones.push(eq(facturas.formaPago, filtros.formaPago));
  }
  if (filtros.desde) {
    condiciones.push(gte(facturas.fecha, inicioDiaUtc(filtros.desde)));
  }
  if (filtros.hasta) {
    const siguiente = new Date(inicioDiaUtc(filtros.hasta));
    siguiente.setUTCDate(siguiente.getUTCDate() + 1);
    condiciones.push(lt(facturas.fecha, siguiente.toISOString()));
  }
  if (filtros.q) {
    const term = filtros.q.toLocaleLowerCase();
    const search = or(
      sql`lower(coalesce(${clientes.nombre}, 'Consumidor final')) like ${`%${term}%`}`,
      sql`lower(${usuarios.nombre}) like ${`%${term}%`}`,
      sql`lower(printf('%04d-%08d', ${facturas.puntoVenta}, ${facturas.numero})) like ${`%${term}%`}`,
    );
    if (search) condiciones.push(search);
  }

  const where = condiciones.length > 0 ? and(...condiciones) : undefined;
  const page = filtros.page;
  const pageSize = filtros.pageSize;
  const [totalRow] = await db
    .select({ total: sql<number>`count(*)` })
    .from(facturas)
    .leftJoin(clientes, eq(facturas.clienteId, clientes.id))
    .innerJoin(usuarios, eq(facturas.usuarioId, usuarios.id))
    .where(where);

  const items = await db
    .select({
      id: facturas.id,
      puntoVenta: facturas.puntoVenta,
      numero: facturas.numero,
      fecha: facturas.fecha,
      clienteId: facturas.clienteId,
      clienteNombre: clientes.nombre,
      usuarioId: facturas.usuarioId,
      vendedorNombre: usuarios.nombre,
      total: facturas.total,
      formaPago: facturas.formaPago,
      estado: facturas.estado,
    })
    .from(facturas)
    .leftJoin(clientes, eq(facturas.clienteId, clientes.id))
    .innerJoin(usuarios, eq(facturas.usuarioId, usuarios.id))
    .where(where)
    .orderBy(desc(facturas.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const total = Number(totalRow?.total ?? 0);
  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/** RF-V2: Devuelve el comprobante y sus ítems sin exponer datos de pago sensibles. */
export async function obtenerFacturaDetalle(
  _usuario: UsuarioSesion,
  input: unknown,
) {
  const { id } = facturaIdSchema.parse(input);
  const [factura] = await db
    .select({
      id: facturas.id,
      puntoVenta: facturas.puntoVenta,
      numero: facturas.numero,
      fecha: facturas.fecha,
      clienteId: facturas.clienteId,
      clienteNombre: clientes.nombre,
      clienteDoc: clientes.nroDoc,
      usuarioId: facturas.usuarioId,
      vendedorNombre: usuarios.nombre,
      total: facturas.total,
      formaPago: facturas.formaPago,
      montoRecibido: facturas.montoRecibido,
      tarjetaTipo: facturas.tarjetaTipo,
      tarjetaMarca: facturas.tarjetaMarca,
      tarjetaUltimos4: facturas.tarjetaUltimos4,
      estado: facturas.estado,
      motivoAnulacion: facturas.motivoAnulacion,
      fechaAnulacion: facturas.fechaAnulacion,
    })
    .from(facturas)
    .leftJoin(clientes, eq(facturas.clienteId, clientes.id))
    .innerJoin(usuarios, eq(facturas.usuarioId, usuarios.id))
    .where(eq(facturas.id, id))
    .limit(1);

  if (!factura) {
    throw new ApiError(404, "NO_ENCONTRADO", "Factura no encontrada.");
  }

  const items = await db
    .select({
      id: facturaItems.id,
      productoId: facturaItems.productoId,
      codigo: productos.codigo,
      descripcion: facturaItems.descripcion,
      cantidad: facturaItems.cantidad,
      precioUnitario: facturaItems.precioUnitario,
      subtotal: facturaItems.subtotal,
    })
    .from(facturaItems)
    .innerJoin(productos, eq(facturaItems.productoId, productos.id))
    .where(eq(facturaItems.facturaId, id));

  return { ...factura, items };
}

/** RF-V3: Valida la venta, aplica límites y registra factura, cuenta y stock atómicamente. */
export async function crearFactura(
  usuario: UsuarioSesion,
  input: unknown,
) {
  const data = crearFacturaSchema.parse(input);
  const cantidadesPorProducto = new Map<number, number>();
  for (const item of data.items) {
    cantidadesPorProducto.set(
      item.productoId,
      (cantidadesPorProducto.get(item.productoId) ?? 0) + item.cantidad,
    );
  }

  return db.transaction(async (tx) => {
    const fecha = ahoraIsoUtc();
    let cliente: typeof clientes.$inferSelect | null = null;

    if (data.clienteId) {
      const [encontrado] = await tx
        .select()
        .from(clientes)
        .where(eq(clientes.id, data.clienteId))
        .limit(1);

      if (!encontrado || !encontrado.activo) {
        throw new ApiError(
          404,
          "NO_ENCONTRADO",
          "El cliente seleccionado no existe o está inactivo.",
        );
      }
      cliente = encontrado;
    }

    if (data.formaPago === "cuenta_corriente" && !cliente?.cuentaCorriente) {
      throw new ApiError(
        422,
        "CUENTA_CORRIENTE_NO_HABILITADA",
        "El cliente no tiene cuenta corriente habilitada.",
      );
    }

    const itemsCalculados: Array<{
      productoId: number;
      descripcion: string;
      cantidad: number;
      precioUnitario: number;
      subtotal: number;
    }> = [];
    let totalFactura = 0;

    for (const [productoId, cantidad] of cantidadesPorProducto.entries()) {
      const [producto] = await tx
        .select()
        .from(productos)
        .where(eq(productos.id, productoId))
        .limit(1);

      if (!producto) {
        throw new ApiError(
          404,
          "NO_ENCONTRADO",
          `El repuesto con ID ${productoId} no existe.`,
        );
      }
      if (!producto.activo) {
        throw new ApiError(
          422,
          "PRODUCTO_INACTIVO",
          `El repuesto "${producto.descripcion}" está inactivo.`,
        );
      }
      if (producto.existencia < cantidad) {
        throw new ApiError(
          409,
          "STOCK_INSUFICIENTE",
          `Stock insuficiente para "${producto.descripcion}". Disponible: ${producto.existencia}.`,
        );
      }

      const subtotal = producto.precio * cantidad;
      totalFactura += subtotal;
      itemsCalculados.push({
        productoId: producto.id,
        descripcion: producto.descripcion,
        cantidad,
        precioUnitario: producto.precio,
        subtotal,
      });
    }

    if (data.formaPago === "contado" && data.montoRecibido != null) {
      if (data.montoRecibido < totalFactura) {
        throw new ApiError(
          422,
          "MONTO_INSUFICIENTE",
          "El monto recibido en efectivo es menor al total de la factura.",
        );
      }
    }

    if (data.formaPago === "cuenta_corriente" && cliente) {
      const saldoActual = await calcularSaldoCliente(cliente.id, tx);
      const limite = cliente.limiteCredito ?? 0;
      if (saldoActual + totalFactura > limite) {
        throw new ApiError(
          422,
          "LIMITE_CREDITO_EXCEDIDO",
          "La venta supera el límite de crédito disponible del cliente.",
        );
      }
    }

    const [maxRow] = await tx
      .select({ maxNumero: sql<number>`coalesce(max(${facturas.numero}), 0)` })
      .from(facturas);
    const siguienteNumero = Number(maxRow?.maxNumero ?? 0) + 1;
    const numeroFormateado = formatearNumeroFactura(
      PUNTO_VENTA_ACTUAL,
      siguienteNumero,
    );

    const [facturaCreada] = await tx
      .insert(facturas)
      .values({
        puntoVenta: PUNTO_VENTA_ACTUAL,
        numero: siguienteNumero,
        fecha,
        clienteId: cliente?.id ?? null,
        usuarioId: usuario.id,
        total: totalFactura,
        formaPago: data.formaPago,
        montoRecibido:
          data.formaPago === "contado"
            ? (data.montoRecibido ?? totalFactura)
            : null,
        tarjetaTipo:
          data.formaPago === "tarjeta" ? (data.tarjetaTipo ?? null) : null,
        tarjetaMarca:
          data.formaPago === "tarjeta" ? (data.tarjetaMarca ?? null) : null,
        tarjetaUltimos4:
          data.formaPago === "tarjeta"
            ? (data.tarjetaUltimos4 ?? null)
            : null,
        estado: "emitida",
      })
      .returning();

    for (const item of itemsCalculados) {
      await tx.insert(facturaItems).values({
        facturaId: facturaCreada.id,
        productoId: item.productoId,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal,
      });

      await moverStock(tx, {
        productoId: item.productoId,
        tipo: "venta",
        cantidad: item.cantidad,
        motivo: `Venta Factura ${numeroFormateado}`,
        facturaId: facturaCreada.id,
        usuarioId: usuario.id,
        fecha,
      });
    }

    if (data.formaPago === "cuenta_corriente" && cliente) {
      await tx.insert(movimientosCuenta).values({
        clienteId: cliente.id,
        tipo: "debito",
        importe: totalFactura,
        fecha,
        descripcion: `Factura ${numeroFormateado}`,
        facturaId: facturaCreada.id,
      });
    }

    return facturaCreada;
  });
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

/** RF-V6, Regla 2: Solo un administrador puede anular una factura con motivo obligatorio. */
export async function anularFactura(
  usuario: UsuarioSesion,
  input: unknown,
) {
  const { id: facturaId, motivoAnulacion } =
    anularFacturaInputSchema.parse(input);
  exigirAdmin(usuario);
  return db.transaction(async (tx) => {
    const [factura] = await tx
      .select()
      .from(facturas)
      .where(eq(facturas.id, facturaId))
      .limit(1);

    if (!factura) {
      throw new ApiError(404, "NO_ENCONTRADO", "Factura no encontrada.");
    }
    if (factura.estado === "anulada") {
      throw new ApiError(
        409,
        "FACTURA_ANULADA",
        "Esta factura ya se encuentra anulada.",
      );
    }

    const fecha = ahoraIsoUtc();
    const numeroFormateado = formatearNumeroFactura(
      factura.puntoVenta,
      factura.numero,
    );
    const [anulada] = await tx
      .update(facturas)
      .set({
        estado: "anulada",
        motivoAnulacion,
        fechaAnulacion: fecha,
        usuarioAnulacionId: usuario.id,
      })
      .where(
        and(eq(facturas.id, facturaId), eq(facturas.estado, "emitida")),
      )
      .returning();

    if (!anulada) {
      throw new ApiError(
        409,
        "FACTURA_ANULADA",
        "Esta factura ya se encuentra anulada.",
      );
    }

    const items = await tx
      .select()
      .from(facturaItems)
      .where(eq(facturaItems.facturaId, facturaId));

    for (const item of items) {
      await moverStock(tx, {
        productoId: item.productoId,
        tipo: "anulacion",
        cantidad: item.cantidad,
        motivo: `Anulación Factura ${numeroFormateado}`,
        observacion: motivoAnulacion,
        facturaId: factura.id,
        usuarioId: usuario.id,
        fecha,
      });
    }

    if (factura.formaPago === "cuenta_corriente" && factura.clienteId) {
      await tx.insert(movimientosCuenta).values({
        clienteId: factura.clienteId,
        tipo: "credito",
        importe: factura.total,
        fecha,
        descripcion: `Anulación Factura ${numeroFormateado}`,
        facturaId: factura.id,
      });
    }

    return anulada;
  });
}
