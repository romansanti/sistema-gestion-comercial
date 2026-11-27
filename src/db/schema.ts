import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const createdAt = () =>
  text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`);

export const usuarios = sqliteTable("usuarios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  nombre: text("nombre").notNull(),
  passwordHash: text("password_hash").notNull(),
  rol: text("rol", { enum: ["admin", "vendedor"] }).notNull(),
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
});

export const categorias = sqliteTable("categorias", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull().unique(),
  activa: integer("activa", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
});

export const productos = sqliteTable("productos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  codigo: text("codigo").notNull().unique(),
  descripcion: text("descripcion").notNull(),
  categoriaId: integer("categoria_id")
    .notNull()
    .references(() => categorias.id),
  precio: integer("precio").notNull(),
  existencia: integer("existencia").notNull().default(0),
  stockMinimo: integer("stock_minimo").notNull().default(0),
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
});

export const clientes = sqliteTable("clientes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tipoDoc: text("tipo_doc", { enum: ["DNI", "CUIT"] }).notNull(),
  nroDoc: text("nro_doc").notNull().unique(),
  nombre: text("nombre").notNull(),
  domicilio: text("domicilio"),
  telefono: text("telefono"),
  email: text("email"),
  cuentaCorriente: integer("cuenta_corriente", { mode: "boolean" })
    .notNull()
    .default(false),
  limiteCredito: integer("limite_credito"),
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
});

export const facturas = sqliteTable("facturas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  puntoVenta: integer("punto_venta").notNull().default(1),
  numero: integer("numero").notNull().unique(),
  fecha: text("fecha").notNull(),
  clienteId: integer("cliente_id").references(() => clientes.id),
  usuarioId: integer("usuario_id")
    .notNull()
    .references(() => usuarios.id),
  total: integer("total").notNull(),
  formaPago: text("forma_pago", {
    enum: ["contado", "tarjeta", "cuenta_corriente"],
  }).notNull(),
  montoRecibido: integer("monto_recibido"),
  tarjetaTipo: text("tarjeta_tipo", { enum: ["debito", "credito"] }),
  tarjetaMarca: text("tarjeta_marca"),
  tarjetaUltimos4: text("tarjeta_ultimos4"),
  estado: text("estado", { enum: ["emitida", "anulada"] })
    .notNull()
    .default("emitida"),
  motivoAnulacion: text("motivo_anulacion"),
  fechaAnulacion: text("fecha_anulacion"),
  usuarioAnulacionId: integer("usuario_anulacion_id").references(
    () => usuarios.id,
  ),
  createdAt: createdAt(),
});

export const facturaItems = sqliteTable("factura_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  facturaId: integer("factura_id")
    .notNull()
    .references(() => facturas.id),
  productoId: integer("producto_id")
    .notNull()
    .references(() => productos.id),
  descripcion: text("descripcion").notNull(),
  cantidad: integer("cantidad").notNull(),
  precioUnitario: integer("precio_unitario").notNull(),
  subtotal: integer("subtotal").notNull(),
  createdAt: createdAt(),
});

export const movimientosStock = sqliteTable("movimientos_stock", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productoId: integer("producto_id")
    .notNull()
    .references(() => productos.id),
  tipo: text("tipo", {
    enum: ["venta", "anulacion", "ingreso", "egreso"],
  }).notNull(),
  cantidad: integer("cantidad").notNull(),
  existenciaResultante: integer("existencia_resultante").notNull(),
  motivo: text("motivo").notNull(),
  observacion: text("observacion"),
  facturaId: integer("factura_id").references(() => facturas.id),
  usuarioId: integer("usuario_id")
    .notNull()
    .references(() => usuarios.id),
  fecha: text("fecha").notNull(),
  createdAt: createdAt(),
});

export const pagos = sqliteTable("pagos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  numeroRecibo: text("numero_recibo").notNull().unique(),
  clienteId: integer("cliente_id")
    .notNull()
    .references(() => clientes.id),
  usuarioId: integer("usuario_id")
    .notNull()
    .references(() => usuarios.id),
  fecha: text("fecha").notNull(),
  importe: integer("importe").notNull(),
  medio: text("medio", {
    enum: ["efectivo", "transferencia", "tarjeta_debito"],
  }).notNull(),
  observacion: text("observacion"),
  createdAt: createdAt(),
});

export const movimientosCuenta = sqliteTable("movimientos_cuenta", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clienteId: integer("cliente_id")
    .notNull()
    .references(() => clientes.id),
  tipo: text("tipo", { enum: ["debito", "credito"] }).notNull(),
  importe: integer("importe").notNull(),
  fecha: text("fecha").notNull(),
  descripcion: text("descripcion").notNull(),
  facturaId: integer("factura_id").references(() => facturas.id),
  pagoId: integer("pago_id").references(() => pagos.id),
  createdAt: createdAt(),
});
