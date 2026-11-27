import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { db } from "./index";
import {
  categorias,
  clientes,
  facturaItems,
  facturas,
  movimientosCuenta,
  movimientosStock,
  pagos,
  productos,
  usuarios,
} from "./schema";

const pesos = (amount: number) => amount * 100;
const daysAgo = (days: number, hour = 12) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
};

const userSeeds = [
  {
    email: "carlos.navarro@ruta9repuestos.com",
    nombre: "Carlos Navarro",
    password: "Admin1234!",
    rol: "admin" as const,
  },
  {
    email: "sofia.quiroga@ruta9repuestos.com",
    nombre: "Sofía Quiroga",
    password: "Vendedor1234!",
    rol: "vendedor" as const,
  },
  {
    email: "martin.salazar@ruta9repuestos.com",
    nombre: "Martín Salazar",
    password: "Vendedor1234!",
    rol: "vendedor" as const,
  },
];

const categorySeeds = [
  "Kits de Transmisión",
  "Frenos y Pastillas",
  "Lubricantes y Fluidos",
  "Baterías y Encendido",
  "Neumáticos y Cámaras",
  "Filtros y Juntas",
];

const productSeeds = [
  { codigo: "TRA-101", descripcion: "Kit transmisión Honda CG 150 (cadena, corona y piñón)", categoria: "Kits de Transmisión", precio: pesos(68900), minimo: 5, final: 2 },
  { codigo: "TRA-102", descripcion: "Kit transmisión Yamaha FZ 16", categoria: "Kits de Transmisión", precio: pesos(82400), minimo: 4, final: 12 },
  { codigo: "TRA-103", descripcion: "Cadena reforzada 428H x 132 eslabones", categoria: "Kits de Transmisión", precio: pesos(24700), minimo: 6, final: 18 },
  { codigo: "TRA-104", descripcion: "Piñón de ataque 14 dientes para Motomel S2", categoria: "Kits de Transmisión", precio: pesos(12900), minimo: 5, final: 14 },
  { codigo: "FRE-204", descripcion: "Pastillas de freno delanteras Toyota Etios", categoria: "Frenos y Pastillas", precio: pesos(36400), minimo: 6, final: 1 },
  { codigo: "FRE-205", descripcion: "Disco de freno ventilado VW Gol Trend", categoria: "Frenos y Pastillas", precio: pesos(57900), minimo: 4, final: 15 },
  { codigo: "FRE-206", descripcion: "Líquido de frenos DOT 4 x 1 litro", categoria: "Frenos y Pastillas", precio: pesos(11800), minimo: 8, final: 22 },
  { codigo: "LUB-305", descripcion: "Aceite Motul 5100 10W-40 1 litro", categoria: "Lubricantes y Fluidos", precio: pesos(21300), minimo: 10, final: 3 },
  { codigo: "LUB-306", descripcion: "Aceite Elaion F50 5W-30 sintético 4 litros", categoria: "Lubricantes y Fluidos", precio: pesos(48900), minimo: 5, final: 16 },
  { codigo: "LUB-307", descripcion: "Refrigerante orgánico concentrado 1 litro", categoria: "Lubricantes y Fluidos", precio: pesos(9400), minimo: 8, final: 26 },
  { codigo: "BAT-402", descripcion: "Batería Moura 12V 65Ah borne positivo derecho", categoria: "Baterías y Encendido", precio: pesos(176500), minimo: 3, final: 1 },
  { codigo: "BAT-403", descripcion: "Bujía NGK CPR8EA-9 para moto 150 cc", categoria: "Baterías y Encendido", precio: pesos(8900), minimo: 8, final: 24 },
  { codigo: "BAT-404", descripcion: "Bobina de encendido Fiat Palio Fire", categoria: "Baterías y Encendido", precio: pesos(32600), minimo: 4, final: 11 },
  { codigo: "NEU-501", descripcion: "Cámara reforzada 90/90-18 para moto", categoria: "Neumáticos y Cámaras", precio: pesos(15800), minimo: 7, final: 2 },
  { codigo: "NEU-502", descripcion: "Neumático Pirelli MT 60 90/90-19", categoria: "Neumáticos y Cámaras", precio: pesos(78200), minimo: 3, final: 9 },
  { codigo: "NEU-503", descripcion: "Parche para cámara tipo seta x 10 unidades", categoria: "Neumáticos y Cámaras", precio: pesos(6200), minimo: 10, final: 32 },
  { codigo: "FIL-601", descripcion: "Filtro de aceite Mann W 610/3", categoria: "Filtros y Juntas", precio: pesos(13700), minimo: 8, final: 9 },
  { codigo: "FIL-602", descripcion: "Filtro de aire Chevrolet Onix 1.4", categoria: "Filtros y Juntas", precio: pesos(16800), minimo: 5, final: 17 },
  { codigo: "FIL-603", descripcion: "Juego de juntas tapa de cilindro Renault K4M", categoria: "Filtros y Juntas", precio: pesos(42800), minimo: 3, final: 10 },
  { codigo: "FIL-604", descripcion: "Filtro de combustible universal roscado", categoria: "Filtros y Juntas", precio: pesos(7900), minimo: 7, final: 23 },
];

const customerSeeds = [
  { tipoDoc: "CUIT" as const, nroDoc: "30714567891", nombre: "Taller Mecánico El Pistón SRL", domicilio: "Av. Mitre 1450, San Martín", telefono: "11-4455-1201", email: "compras@elpiston.com.ar", limiteCredito: pesos(1200000), cuentaCorriente: true },
  { tipoDoc: "CUIT" as const, nroDoc: "30723894561", nombre: "Lubricentro San Martín", domicilio: "Belgrano 820, San Martín", telefono: "11-4455-1202", email: "ventas@lubrisanmartin.com.ar", limiteCredito: pesos(850000), cuentaCorriente: true },
  { tipoDoc: "CUIT" as const, nroDoc: "30698745231", nombre: "Rectificadora Norte SA", domicilio: "Ruta 9 km 48, Escobar", telefono: "11-4455-1203", email: "administracion@rectificnorte.com.ar", limiteCredito: pesos(1800000), cuentaCorriente: true },
  { tipoDoc: "DNI" as const, nroDoc: "27184563", nombre: "Diego Alejandro Ferreyra", domicilio: "Las Heras 235, Zárate", telefono: "3487-412304", email: "diego.ferreyra@example.com", limiteCredito: pesos(300000), cuentaCorriente: true },
  { tipoDoc: "CUIT" as const, nroDoc: "30765421983", nombre: "Moto Taller Ruta 9", domicilio: "Av. Antártida Argentina 910, Campana", telefono: "3489-423105", email: "repuestos@mototallerruta9.com.ar", limiteCredito: pesos(950000), cuentaCorriente: true },
  { tipoDoc: "DNI" as const, nroDoc: "30456789", nombre: "Valeria Soledad Bustos", domicilio: "Sarmiento 177, Tigre", telefono: "11-4455-1206", email: "valeria.bustos@example.com", limiteCredito: pesos(250000), cuentaCorriente: true },
  { tipoDoc: "CUIT" as const, nroDoc: "30781234965", nombre: "Autopartes El Cruce SRL", domicilio: "Ruta 9 y Rivadavia, Garín", telefono: "11-4455-1207", email: "pedidos@elcruce.com.ar", limiteCredito: null, cuentaCorriente: false },
  { tipoDoc: "DNI" as const, nroDoc: "32678145", nombre: "Nicolás Ezequiel Acosta", domicilio: "Italia 630, Escobar", telefono: "11-4455-1208", email: "nicolas.acosta@example.com", limiteCredito: null, cuentaCorriente: false },
];

const invoiceSeeds = Array.from({ length: 35 }, (_, index) => {
  const firstProductIndex = (index * 7) % productSeeds.length;
  let secondProductIndex = (index * 11 + 5) % productSeeds.length;
  if (secondProductIndex === firstProductIndex) {
    secondProductIndex = (secondProductIndex + 1) % productSeeds.length;
  }
  const clienteIndex = index % customerSeeds.length;
  const formaPago =
    clienteIndex < 6 && index % 5 === 0
      ? "cuenta_corriente"
      : index % 4 === 0
        ? "tarjeta"
        : "contado";

  return {
    numero: 91001 + index,
    fecha: daysAgo(29 - Math.floor((index * 29) / 34), 9 + (index % 9)),
    clienteIndex,
    usuarioIndex: index % 2 === 0 ? 1 : 2,
    formaPago: formaPago as "contado" | "tarjeta" | "cuenta_corriente",
    items: [
      { codigo: productSeeds[firstProductIndex].codigo, cantidad: index % 3 === 0 ? 2 : 1 },
      { codigo: productSeeds[secondProductIndex].codigo, cantidad: 1 + (index % 2) },
    ],
  };
});

async function seed() {
  const databaseUrl = process.env.TURSO_DATABASE_URL;
  if (databaseUrl && databaseUrl !== "file:local.db") {
    throw new Error("El seed destructivo solo puede ejecutarse contra file:local.db.");
  }

  const passwordHashes = await Promise.all(
    userSeeds.map(({ password }) => bcrypt.hash(password, 10)),
  );

  await db.transaction(async (tx) => {
    await tx.delete(movimientosCuenta);
    await tx.delete(pagos);
    await tx.delete(movimientosStock);
    await tx.delete(facturaItems);
    await tx.delete(facturas);
    await tx.delete(productos);
    await tx.delete(categorias);
    await tx.delete(clientes);
    await tx.delete(usuarios);

    const userRows = await tx.insert(usuarios).values(
      userSeeds.map((user, index) => ({
        email: user.email,
        nombre: user.nombre,
        passwordHash: passwordHashes[index],
        rol: user.rol,
        activo: true,
      })),
    ).returning();
    const userByEmail = new Map(userRows.map((user) => [user.email, user]));
    const admin = userByEmail.get(userSeeds[0].email);
    const sellers = [userByEmail.get(userSeeds[1].email), userByEmail.get(userSeeds[2].email)];
    if (!admin || sellers.some((seller) => !seller)) {
      throw new Error("No se pudieron cargar los usuarios iniciales.");
    }

    const categoryRows = await tx.insert(categorias).values(
      categorySeeds.map((nombre) => ({ nombre, activa: true })),
    ).returning();
    const categoryByName = new Map(categoryRows.map((category) => [category.nombre, category]));
    const customerRows = await tx.insert(clientes).values(
      customerSeeds.map((customer) => ({ ...customer, activo: true })),
    ).returning();

    const salesByCode = new Map<string, number>();
    for (const invoice of invoiceSeeds) {
      for (const item of invoice.items) {
        salesByCode.set(item.codigo, (salesByCode.get(item.codigo) ?? 0) + item.cantidad);
      }
    }
    const productRows = await tx.insert(productos).values(
      productSeeds.map((product) => {
        const category = categoryByName.get(product.categoria);
        if (!category) throw new Error(`No se encontró la categoría ${product.categoria}.`);
        return {
          codigo: product.codigo,
          descripcion: product.descripcion,
          categoriaId: category.id,
          precio: product.precio,
          existencia: product.final + (salesByCode.get(product.codigo) ?? 0),
          stockMinimo: product.minimo,
          activo: true,
        };
      }),
    ).returning();
    const productByCode = new Map(productRows.map((product) => [product.codigo, { ...product }]));

    for (const [index, invoiceSeed] of invoiceSeeds.entries()) {
      const customer = customerRows[invoiceSeed.clienteIndex];
      const user = sellers[invoiceSeed.usuarioIndex - 1];
      if (!customer || !user) {
        throw new Error("No se encontró el cliente o vendedor de una factura inicial.");
      }
      const itemRows = invoiceSeed.items.map((item) => {
        const product = productByCode.get(item.codigo);
        if (!product) throw new Error(`No se encontró el producto ${item.codigo}.`);
        return { product, cantidad: item.cantidad, subtotal: product.precio * item.cantidad };
      });
      const total = itemRows.reduce((sum, item) => sum + item.subtotal, 0);
      const [invoice] = await tx.insert(facturas).values({
        puntoVenta: 1,
        numero: invoiceSeed.numero,
        fecha: invoiceSeed.fecha,
        clienteId: customer.id,
        usuarioId: user.id,
        total,
        formaPago: invoiceSeed.formaPago,
        montoRecibido: invoiceSeed.formaPago === "cuenta_corriente" ? null : total,
        tarjetaTipo: invoiceSeed.formaPago === "tarjeta" ? "credito" : null,
        tarjetaMarca: invoiceSeed.formaPago === "tarjeta" ? "Visa" : null,
        tarjetaUltimos4: invoiceSeed.formaPago === "tarjeta" ? String(1000 + (index % 9000)) : null,
        estado: "emitida",
      }).returning();

      for (const { product, cantidad, subtotal } of itemRows) {
        product.existencia -= cantidad;
        await tx.insert(facturaItems).values({
          facturaId: invoice.id,
          productoId: product.id,
          descripcion: product.descripcion,
          cantidad,
          precioUnitario: product.precio,
          subtotal,
        });
        await tx.update(productos)
          .set({ existencia: product.existencia })
          .where(eq(productos.id, product.id));
        await tx.insert(movimientosStock).values({
          productoId: product.id,
          tipo: "venta",
          cantidad: -cantidad,
          existenciaResultante: product.existencia,
          motivo: "Venta de demostración",
          facturaId: invoice.id,
          usuarioId: user.id,
          fecha: invoice.fecha,
        });
      }

      if (invoice.formaPago === "cuenta_corriente") {
        await tx.insert(movimientosCuenta).values({
          clienteId: customer.id,
          tipo: "debito",
          importe: total,
          fecha: invoice.fecha,
          descripcion: `Factura ${invoice.numero}`,
          facturaId: invoice.id,
        });
      }
    }

    for (const [index, customer] of customerRows.entries()) {
      if (!customer.cuentaCorriente) continue;
      const [balance] = await tx.select({
        saldo: sql<number>`coalesce(sum(case when ${movimientosCuenta.tipo} = 'debito' then ${movimientosCuenta.importe} else -${movimientosCuenta.importe} end), 0)`,
      }).from(movimientosCuenta).where(eq(movimientosCuenta.clienteId, customer.id));
      const importe = Math.min(pesos(18000 + index * 7000), Number(balance?.saldo ?? 0));
      if (importe <= 0) continue;
      const paymentUser = sellers[index % sellers.length];
      if (!paymentUser) throw new Error("No se encontró un vendedor para el recibo inicial.");
      const [payment] = await tx.insert(pagos).values({
        numeroRecibo: `R 0001-${String(index + 1).padStart(8, "0")}`,
        clienteId: customer.id,
        usuarioId: paymentUser.id,
        fecha: daysAgo(index + 1, 15),
        importe,
        medio: index % 2 === 0 ? "transferencia" : "efectivo",
        observacion: "Pago parcial de demostración",
      }).returning();
      await tx.insert(movimientosCuenta).values({
        clienteId: customer.id,
        tipo: "credito",
        importe: payment.importe,
        fecha: payment.fecha,
        descripcion: `Recibo ${payment.numeroRecibo}`,
        pagoId: payment.id,
      });
    }
  });

  console.log("Seed reiniciado: 3 usuarios, 6 categorías, 20 repuestos, 8 clientes y 35 facturas.");
}

seed().catch((error: unknown) => {
  console.error("Error al reiniciar los datos iniciales:", error);
  process.exitCode = 1;
});
