import bcrypt from "bcryptjs";
import { db } from "./index";
import {
  usuarios,
  categorias,
  productos,
  clientes,
  facturas,
  facturaItems,
  movimientosStock,
  pagos,
  movimientosCuenta,
} from "./schema";

async function seed() {
  console.log("Cargando datos de prueba: Casa de Repuestos Motos y Autos...");

  // Limpiar tablas en orden inverso a las claves foráneas
  await db.delete(movimientosCuenta);
  await db.delete(pagos);
  await db.delete(movimientosStock);
  await db.delete(facturaItems);
  await db.delete(facturas);
  await db.delete(productos);
  await db.delete(categorias);
  await db.delete(clientes);
  await db.delete(usuarios);

  const hoy = new Date().toISOString();

  // 1. Usuarios (clave para ambos: 123456)
  const passwordHash = await bcrypt.hash("123456", 10);

  const [adminUser, vendedorUser] = await db
    .insert(usuarios)
    .values([
      {
        email: "admin@repuestos.com",
        nombre: "León Carobbio (Encargado)",
        passwordHash,
        rol: "admin",
        activo: true,
      },
      {
        email: "vendedor@repuestos.com",
        nombre: "Santi Román (Mostrador)",
        passwordHash,
        rol: "vendedor",
        activo: true,
      },
    ])
    .returning();

  // 2. Categorías
  const [catMotos, catAutos, catLubricantes, catElectricidad] = await db
    .insert(categorias)
    .values([
      { nombre: "Repuestos Motos", activa: true },
      { nombre: "Repuestos Autos", activa: true },
      { nombre: "Lubricantes y Filtros", activa: true },
      { nombre: "Electricidad e Iluminación", activa: true },
    ])
    .returning();

  // 3. Productos (precios en centavos)
  const listaProductos = await db
    .insert(productos)
    .values([
      {
        codigo: "MOT-KIT-110",
        descripcion: "Kit Transmisión Completo 110cc (Honda Wave / Smash / Blitz)",
        categoriaId: catMotos.id,
        precio: 2450000, // $24.500,00
        existencia: 13,
        stockMinimo: 4,
        activo: true,
      },
      {
        codigo: "MOT-PAST-CG",
        descripcion: "Pastillas de Freno Delanteras Honda CG Titan 150 / XR 150",
        categoriaId: catMotos.id,
        precio: 890000, // $8.900,00
        existencia: 22,
        stockMinimo: 6,
        activo: true,
      },
      {
        codigo: "MOT-CUB-9090",
        descripcion: "Cubierta Trasera 90/90-18 Reforzada Sin Cámara",
        categoriaId: catMotos.id,
        precio: 5400000, // $54.000,00
        existencia: 6,
        stockMinimo: 2,
        activo: true,
      },
      {
        codigo: "AUT-FIL-GOL",
        descripcion: "Kit Filtros Aire + Aceite + Nafta VW Gol Trend / Voyage 1.6",
        categoriaId: catLubricantes.id,
        precio: 3280000, // $32.800,00
        existencia: 12,
        stockMinimo: 3,
        activo: true,
      },
      {
        codigo: "AUT-DIST-COR",
        descripcion: "Kit Distribución Correa + Tensor Chevrolet Corsa Classic 1.4",
        categoriaId: catAutos.id,
        precio: 5890000, // $58.900,00
        existencia: 8,
        stockMinimo: 2,
        activo: true,
      },
      {
        codigo: "AUT-BUJ-NGK",
        descripcion: "Juego 4 Bujías Encendido Fiat Palio / Siena / Uno Fire 1.4",
        categoriaId: catAutos.id,
        precio: 2100000, // $21.000,00
        existencia: 18,
        stockMinimo: 5,
        activo: true,
      },
      {
        codigo: "LUB-10W40-1L",
        descripcion: "Aceite Sintético 4T 10W-40 1L JASO MA2",
        categoriaId: catLubricantes.id,
        precio: 1420000, // $14.200,00
        existencia: 27,
        stockMinimo: 10,
        activo: true,
      },
      {
        codigo: "ELE-BAT-12V",
        descripcion: "Batería Gel 12V 7Ah Libre Mantenimiento (Twister / FZ16)",
        categoriaId: catElectricidad.id,
        precio: 4650000, // $46.500,00
        existencia: 3, // Stock bajo para probar alertas
        stockMinimo: 4,
        activo: true,
      },
      {
        codigo: "ELE-LAM-H4",
        descripcion: "Lámpara Halógena H4 12V 60/55W Auto / Moto",
        categoriaId: catElectricidad.id,
        precio: 450000, // $4.500,00
        existencia: 40,
        stockMinimo: 10,
        activo: true,
      },
    ])
    .returning();

  // Movimientos iniciales de stock
  await db.insert(movimientosStock).values(
    listaProductos.map((p) => ({
      productoId: p.id,
      tipo: "ingreso" as const,
      cantidad: p.existencia,
      existenciaResultante: p.existencia,
      motivo: "Stock inicial de inventario",
      usuarioId: adminUser.id,
      fecha: hoy,
    })),
  );

  // 4. Clientes (Talleres mecánicos con cuenta corriente + particular)
  const [tallerMotos, tallerAutos, clienteParticular] = await db
    .insert(clientes)
    .values([
      {
        tipoDoc: "CUIT",
        nroDoc: "30-71458920-4",
        nombre: "Taller Mecánico El Rayo (Motos)",
        domicilio: "Av. Belgrano 1420, San Miguel de Tucumán",
        telefono: "3815421190",
        email: "compras@tallerelrayo.com",
        cuentaCorriente: true,
        limiteCredito: 35000000, // $350.000,00
        activo: true,
      },
      {
        tipoDoc: "CUIT",
        nroDoc: "20-34982115-8",
        nombre: "Servicio Integral Automotor Norte",
        domicilio: "Av. Sarmiento 890, San Miguel de Tucumán",
        telefono: "3814893320",
        email: "taller@automotornorte.com",
        cuentaCorriente: true,
        limiteCredito: 80000000, // $800.000,00
        activo: true,
      },
      {
        tipoDoc: "DNI",
        nroDoc: "41258963",
        nombre: "Martín Fernández",
        domicilio: "Las Heras 540",
        telefono: "3816112233",
        email: "mfernandez@mail.com",
        cuentaCorriente: false,
        limiteCredito: null,
        activo: true,
      },
    ])
    .returning();

  // 5. Factura inicial en Cuenta Corriente para Taller El Rayo
  const prodKit = listaProductos[0]; // $24.500
  const prodAceite = listaProductos[6]; // $14.200
  const totalFactura1 = prodKit.precio * 2 + prodAceite.precio * 3; // $91.600

  const [factura1] = await db
    .insert(facturas)
    .values({
      puntoVenta: 1,
      numero: 1,
      fecha: hoy,
      clienteId: tallerMotos.id,
      usuarioId: vendedorUser.id,
      total: totalFactura1,
      formaPago: "cuenta_corriente",
      estado: "emitida",
    })
    .returning();

  await db.insert(facturaItems).values([
    {
      facturaId: factura1.id,
      productoId: prodKit.id,
      descripcion: prodKit.descripcion,
      cantidad: 2,
      precioUnitario: prodKit.precio,
      subtotal: prodKit.precio * 2,
    },
    {
      facturaId: factura1.id,
      productoId: prodAceite.id,
      descripcion: prodAceite.descripcion,
      cantidad: 3,
      precioUnitario: prodAceite.precio,
      subtotal: prodAceite.precio * 3,
    },
  ]);

  // Registrar el débito en cuenta corriente por la factura 1
  await db.insert(movimientosCuenta).values({
    clienteId: tallerMotos.id,
    tipo: "debito",
    importe: totalFactura1,
    fecha: hoy,
    descripcion: "Factura 0001-00000001",
    facturaId: factura1.id,
  });

  // 6. Pago parcial de Taller El Rayo ($40.000) -> saldo adeudado: $51.600
  const [pago1] = await db
    .insert(pagos)
    .values({
      numeroRecibo: "REC-00000001",
      clienteId: tallerMotos.id,
      usuarioId: adminUser.id,
      fecha: hoy,
      importe: 4000000, // $40.000,00
      medio: "transferencia",
      observacion: "Entrega parcial a cuenta",
    })
    .returning();

  await db.insert(movimientosCuenta).values({
    clienteId: tallerMotos.id,
    tipo: "credito",
    importe: 4000000,
    fecha: hoy,
    descripcion: "Recibo REC-00000001",
    pagoId: pago1.id,
  });

  console.log("Seed completado con éxito.");
  console.log("Admin: admin@repuestos.com / 123456");
  console.log("Vendedor: vendedor@repuestos.com / 123456");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error ejecutando seed:", err);
    process.exit(1);
  });
