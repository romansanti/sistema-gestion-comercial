import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db } from "./index";
import {
  categorias,
  clientes,
  facturas,
  pagos,
  productos,
  usuarios,
} from "./schema";
import type { UsuarioSesion } from "@/lib/session";
import { actualizarCategoria, crearCategoria } from "@/services/categorias.service";
import { actualizarCliente, crearCliente } from "@/services/clientes.service";
import { calcularSaldoCliente } from "@/services/clientes.service";
import { anularFactura, crearFactura } from "@/services/facturas.service";
import { registrarPagoCuentaCorriente } from "@/services/pagos.service";
import {
  actualizarProducto,
  crearProducto,
} from "@/services/productos.service";
import { crearUsuario } from "@/services/usuarios.service";

type ProductoSemilla = {
  codigo: string;
  descripcion: string;
  categoria: string;
  precio: number;
  existenciaInicial: number;
  stockMinimo: number;
};

const nombresCategorias = [
  "Repuestos Motos",
  "Repuestos Autos",
  "Lubricantes y Filtros",
  "Electricidad e Iluminación",
  "Accesorios y Herramientas",
];

const productosSemilla: ProductoSemilla[] = [
  {
    codigo: "MOT-KIT-110",
    descripcion: "Kit de transmisión 110cc",
    categoria: "Repuestos Motos",
    precio: 2_450_000,
    existenciaInicial: 15,
    stockMinimo: 4,
  },
  {
    codigo: "MOT-PAST-CG",
    descripcion: "Pastillas de freno Honda CG 150",
    categoria: "Repuestos Motos",
    precio: 890_000,
    existenciaInicial: 22,
    stockMinimo: 6,
  },
  {
    codigo: "MOT-CUB-9090",
    descripcion: "Cubierta trasera 90/90-18",
    categoria: "Repuestos Motos",
    precio: 5_400_000,
    existenciaInicial: 30,
    stockMinimo: 5,
  },
  {
    codigo: "MOT-CAD-428",
    descripcion: "Cadena reforzada paso 428",
    categoria: "Repuestos Motos",
    precio: 1_180_000,
    existenciaInicial: 42,
    stockMinimo: 8,
  },
  {
    codigo: "MOT-CAM-110",
    descripcion: "Cámara 2.50-17 reforzada",
    categoria: "Repuestos Motos",
    precio: 420_000,
    existenciaInicial: 50,
    stockMinimo: 10,
  },
  {
    codigo: "MOT-BUJ-CR7",
    descripcion: "Bujía NGK CR7HSA",
    categoria: "Repuestos Motos",
    precio: 185_000,
    existenciaInicial: 70,
    stockMinimo: 12,
  },
  {
    codigo: "AUT-DIST-COR",
    descripcion: "Kit distribución Chevrolet Corsa",
    categoria: "Repuestos Autos",
    precio: 5_890_000,
    existenciaInicial: 8,
    stockMinimo: 2,
  },
  {
    codigo: "AUT-BUJ-NGK",
    descripcion: "Juego de 4 bujías Fiat Fire",
    categoria: "Repuestos Autos",
    precio: 2_100_000,
    existenciaInicial: 18,
    stockMinimo: 5,
  },
  {
    codigo: "AUT-PAS-GOL",
    descripcion: "Pastillas de freno VW Gol",
    categoria: "Repuestos Autos",
    precio: 1_650_000,
    existenciaInicial: 40,
    stockMinimo: 7,
  },
  {
    codigo: "AUT-COR-UNI",
    descripcion: "Correa poly-v universal",
    categoria: "Repuestos Autos",
    precio: 780_000,
    existenciaInicial: 45,
    stockMinimo: 8,
  },
  {
    codigo: "AUT-FILT-AIR",
    descripcion: "Filtro de aire VW Gol Trend",
    categoria: "Repuestos Autos",
    precio: 620_000,
    existenciaInicial: 38,
    stockMinimo: 6,
  },
  {
    codigo: "AUT-ROT-DEL",
    descripcion: "Rótula de suspensión delantera",
    categoria: "Repuestos Autos",
    precio: 1_290_000,
    existenciaInicial: 32,
    stockMinimo: 5,
  },
  {
    codigo: "LUB-10W40-1L",
    descripcion: "Aceite sintético 4T 10W-40 1L",
    categoria: "Lubricantes y Filtros",
    precio: 1_420_000,
    existenciaInicial: 30,
    stockMinimo: 10,
  },
  {
    codigo: "LUB-15W40-4L",
    descripcion: "Aceite mineral 15W-40 4L",
    categoria: "Lubricantes y Filtros",
    precio: 2_250_000,
    existenciaInicial: 42,
    stockMinimo: 8,
  },
  {
    codigo: "LUB-FIL-GOL",
    descripcion: "Filtro de aceite VW Gol",
    categoria: "Lubricantes y Filtros",
    precio: 390_000,
    existenciaInicial: 55,
    stockMinimo: 12,
  },
  {
    codigo: "LUB-FIL-NAF",
    descripcion: "Filtro de combustible universal",
    categoria: "Lubricantes y Filtros",
    precio: 260_000,
    existenciaInicial: 50,
    stockMinimo: 10,
  },
  {
    codigo: "LUB-ATF-1L",
    descripcion: "Fluido ATF para transmisión 1L",
    categoria: "Lubricantes y Filtros",
    precio: 1_050_000,
    existenciaInicial: 35,
    stockMinimo: 7,
  },
  {
    codigo: "LUB-GRASA-400",
    descripcion: "Grasa multipropósito 400g",
    categoria: "Lubricantes y Filtros",
    precio: 330_000,
    existenciaInicial: 45,
    stockMinimo: 8,
  },
  {
    codigo: "ELE-BAT-12V",
    descripcion: "Batería gel 12V 7Ah",
    categoria: "Electricidad e Iluminación",
    precio: 4_650_000,
    existenciaInicial: 3,
    stockMinimo: 4,
  },
  {
    codigo: "ELE-LAM-H4",
    descripcion: "Lámpara halógena H4 12V",
    categoria: "Electricidad e Iluminación",
    precio: 450_000,
    existenciaInicial: 40,
    stockMinimo: 10,
  },
  {
    codigo: "ELE-REG-12V",
    descripcion: "Regulador de voltaje 12V para moto",
    categoria: "Electricidad e Iluminación",
    precio: 1_350_000,
    existenciaInicial: 35,
    stockMinimo: 6,
  },
  {
    codigo: "ELE-BOMB-H4",
    descripcion: "Juego de lámparas H4 para automóvil",
    categoria: "Electricidad e Iluminación",
    precio: 690_000,
    existenciaInicial: 32,
    stockMinimo: 6,
  },
  {
    codigo: "ELE-BUJ-ENC",
    descripcion: "Bobina de encendido universal",
    categoria: "Electricidad e Iluminación",
    precio: 1_780_000,
    existenciaInicial: 28,
    stockMinimo: 5,
  },
  {
    codigo: "ELE-FUS-SET",
    descripcion: "Kit de fusibles automotor surtidos",
    categoria: "Electricidad e Iluminación",
    precio: 240_000,
    existenciaInicial: 60,
    stockMinimo: 12,
  },
  {
    codigo: "ACC-ESPE-MOT",
    descripcion: "Espejos retrovisores universales para moto",
    categoria: "Accesorios y Herramientas",
    precio: 720_000,
    existenciaInicial: 35,
    stockMinimo: 7,
  },
  {
    codigo: "ACC-CABLE-ACE",
    descripcion: "Cable de acelerador Honda Wave",
    categoria: "Accesorios y Herramientas",
    precio: 310_000,
    existenciaInicial: 45,
    stockMinimo: 9,
  },
  {
    codigo: "ACC-LLAVE-SET",
    descripcion: "Juego de llaves combinadas 8 piezas",
    categoria: "Accesorios y Herramientas",
    precio: 1_890_000,
    existenciaInicial: 24,
    stockMinimo: 4,
  },
  {
    codigo: "ACC-GUANTE-MEC",
    descripcion: "Guantes de trabajo mecánico",
    categoria: "Accesorios y Herramientas",
    precio: 520_000,
    existenciaInicial: 38,
    stockMinimo: 6,
  },
  {
    codigo: "ACC-CRIQUE-2T",
    descripcion: "Criquet hidráulico 2 toneladas",
    categoria: "Accesorios y Herramientas",
    precio: 8_500_000,
    existenciaInicial: 12,
    stockMinimo: 2,
  },
  {
    codigo: "ACC-LINTERNA",
    descripcion: "Lámpara portátil recargable de taller",
    categoria: "Accesorios y Herramientas",
    precio: 1_250_000,
    existenciaInicial: 27,
    stockMinimo: 5,
  },
];

const clientesSemilla = [
  {
    tipoDoc: "CUIT" as const,
    nroDoc: "30-71458920-4",
    nombre: "Taller Mecánico El Rayo (Motos)",
    domicilio: "Av. Belgrano 1420, San Miguel de Tucumán",
    telefono: "3815421190",
    email: "compras@tallerelrayo.example",
    cuentaCorriente: true,
    limiteCredito: 35_000_000,
  },
  {
    tipoDoc: "CUIT" as const,
    nroDoc: "20-34982115-8",
    nombre: "Servicio Integral Automotor Norte",
    domicilio: "Av. Sarmiento 890, San Miguel de Tucumán",
    telefono: "3814893320",
    email: "taller@automotornorte.example",
    cuentaCorriente: true,
    limiteCredito: 80_000_000,
  },
  {
    tipoDoc: "CUIT" as const,
    nroDoc: "30-71829364-1",
    nombre: "Taller Ruta 9",
    domicilio: "Ruta 9 km 1290, Tucumán",
    telefono: "3814552010",
    email: "contacto@tallerruta9.example",
    cuentaCorriente: true,
    limiteCredito: 45_000_000,
  },
  {
    tipoDoc: "CUIT" as const,
    nroDoc: "30-70712211-7",
    nombre: "Motos del Parque",
    domicilio: "Av. Mate de Luna 2200, Tucumán",
    telefono: "3814771200",
    email: "pedidos@motosdelparque.example",
    cuentaCorriente: true,
    limiteCredito: 40_000_000,
  },
  {
    tipoDoc: "CUIT" as const,
    nroDoc: "30-71234567-8",
    nombre: "Taller San Jorge",
    domicilio: "San Martín 640, Yerba Buena",
    telefono: "3814336600",
    email: "taller@sjorge.example",
    cuentaCorriente: true,
    limiteCredito: 50_000_000,
  },
  {
    tipoDoc: "CUIT" as const,
    nroDoc: "30-70987654-3",
    nombre: "Automotores Centro",
    domicilio: "Córdoba 510, San Miguel de Tucumán",
    telefono: "3814218800",
    email: "compras@automotorescentro.example",
    cuentaCorriente: true,
    limiteCredito: 60_000_000,
  },
  {
    tipoDoc: "CUIT" as const,
    nroDoc: "30-71654321-0",
    nombre: "Moto Servicio Güemes",
    domicilio: "Güemes 1870, Tucumán",
    telefono: "3814991430",
    email: "info@motoservicioguemes.example",
    cuentaCorriente: true,
    limiteCredito: 30_000_000,
  },
  {
    tipoDoc: "DNI" as const,
    nroDoc: "41258963",
    nombre: "Martín Fernández",
    domicilio: "Las Heras 540, Tucumán",
    telefono: "3816112233",
    email: "mfernandez@example",
    cuentaCorriente: false,
    limiteCredito: null,
  },
  {
    tipoDoc: "DNI" as const,
    nroDoc: "36894125",
    nombre: "Laura Gómez",
    domicilio: "Maipú 122, Tucumán",
    telefono: "3816334521",
    email: "laura.gomez@example",
    cuentaCorriente: false,
    limiteCredito: null,
  },
  {
    tipoDoc: "DNI" as const,
    nroDoc: "29568147",
    nombre: "Diego Ruiz",
    domicilio: "Italia 950, Tucumán",
    telefono: "3815774200",
    email: "diego.ruiz@example",
    cuentaCorriente: false,
    limiteCredito: null,
  },
];

async function buscarUsuario(email: string): Promise<UsuarioSesion | null> {
  const [usuario] = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      email: usuarios.email,
      rol: usuarios.rol,
    })
    .from(usuarios)
    .where(eq(usuarios.email, email))
    .limit(1);
  return usuario ?? null;
}

async function asegurarUsuarios(): Promise<{
  admin: UsuarioSesion;
  vendedor: UsuarioSesion;
}> {
  const adminEmail = "admin@repuestos.com";
  const adminExistente = await buscarUsuario(adminEmail);
  const actorSemilla: UsuarioSesion = adminExistente ?? {
    id: 0,
    nombre: "Inicialización local",
    email: "seed@local",
    rol: "admin",
  };

  if (!adminExistente) {
    await crearUsuario(actorSemilla, {
      nombre: "León Carobbio (Encargado)",
      email: adminEmail,
      password: "123456",
      rol: "admin",
    });
  }

  const admin = (await buscarUsuario(adminEmail))!;
  if (!(await buscarUsuario("vendedor@repuestos.com"))) {
    await crearUsuario(admin, {
      nombre: "Santi Román (Mostrador)",
      email: "vendedor@repuestos.com",
      password: "123456",
      rol: "vendedor",
    });
  }

  const vendedor = await buscarUsuario("vendedor@repuestos.com");
  if (!vendedor) {
    throw new Error("No se pudo asegurar el usuario vendedor del seed.");
  }
  return { admin, vendedor };
}

async function asegurarCategorias(admin: UsuarioSesion) {
  const resultado = new Map<string, number>();

  for (const nombre of nombresCategorias) {
    const [existente] = await db
      .select()
      .from(categorias)
      .where(eq(categorias.nombre, nombre))
      .limit(1);
    const categoria = existente
      ? existente
      : await crearCategoria(admin, { nombre });

    if (!categoria.activa) {
      await actualizarCategoria(admin, {
        id: categoria.id,
        cambios: { activa: true },
      });
    }
    resultado.set(nombre, categoria.id);
  }

  return resultado;
}

async function asegurarProductos(
  admin: UsuarioSesion,
  categoriaIds: Map<string, number>,
) {
  const productosAsegurados: Array<{
    id: number;
    codigo: string;
    existencia: number;
  }> = [];

  for (const producto of productosSemilla) {
    const [existente] = await db
      .select()
      .from(productos)
      .where(eq(productos.codigo, producto.codigo))
      .limit(1);
    if (existente) {
      if (!existente.activo) {
        await actualizarProducto(admin, {
          id: existente.id,
          cambios: { activo: true },
        });
      }
      productosAsegurados.push({
        id: existente.id,
        codigo: existente.codigo,
        existencia: existente.existencia,
      });
      continue;
    }

    const categoriaId = categoriaIds.get(producto.categoria);
    if (!categoriaId) {
      throw new Error(`No se pudo resolver la categoría ${producto.categoria}.`);
    }
    const creado = await crearProducto(admin, {
      codigo: producto.codigo,
      descripcion: producto.descripcion,
      categoriaId,
      precio: producto.precio,
      existenciaInicial: producto.existenciaInicial,
      stockMinimo: producto.stockMinimo,
    });
    productosAsegurados.push({
      id: creado.id,
      codigo: creado.codigo,
      existencia: creado.existencia,
    });
  }

  return productosAsegurados;
}

async function asegurarClientes(usuario: UsuarioSesion) {
  const resultado: Array<{
    id: number;
    nombre: string;
    cuentaCorriente: boolean;
    activo: boolean;
  }> = [];

  for (const cliente of clientesSemilla) {
    const [existente] = await db
      .select()
      .from(clientes)
      .where(eq(clientes.nroDoc, cliente.nroDoc))
      .limit(1);

    if (!existente) {
      const creado = await crearCliente(usuario, cliente);
      resultado.push({
        id: creado.id,
        nombre: creado.nombre,
        cuentaCorriente: creado.cuentaCorriente,
        activo: creado.activo,
      });
      continue;
    }

    const cambios: {
      cuentaCorriente?: boolean;
      limiteCredito?: number | null;
      activo?: boolean;
    } = {};
    if (cliente.cuentaCorriente && !existente.cuentaCorriente) {
      cambios.cuentaCorriente = true;
      cambios.limiteCredito = cliente.limiteCredito;
    }
    if (!existente.activo) cambios.activo = true;

    if (Object.keys(cambios).length > 0) {
      const actualizado = await actualizarCliente(usuario, {
        id: existente.id,
        cambios,
      });
      resultado.push({
        id: actualizado.id,
        nombre: actualizado.nombre,
        cuentaCorriente: actualizado.cuentaCorriente,
        activo: actualizado.activo,
      });
    } else {
      resultado.push({
        id: existente.id,
        nombre: existente.nombre,
        cuentaCorriente: existente.cuentaCorriente,
        activo: existente.activo,
      });
    }
  }

  return resultado;
}

function fechaDeMuestra(indice: number): string {
  const fecha = new Date();
  fecha.setUTCDate(fecha.getUTCDate() - ((indice * 17) % 30));
  return fecha.toISOString().replace(/\.\d{3}Z$/, "Z");
}

async function asegurarFacturas(
  vendedor: UsuarioSesion,
  clientesDisponibles: Awaited<ReturnType<typeof asegurarClientes>>,
) {
  const [conteo] = await db.select({ total: count() }).from(facturas);
  const existentes = Number(conteo?.total ?? 0);
  if (existentes >= 50) return;

  const clientesActivos = clientesDisponibles.filter(
    (cliente) => cliente.activo,
  );
  const clientesCuenta = clientesActivos.filter(
    (cliente) => cliente.cuentaCorriente,
  );
  if (clientesActivos.length === 0 || clientesCuenta.length === 0) {
    throw new Error("El seed requiere clientes activos y cuentas corrientes.");
  }

  const codigos = productosSemilla.map((producto) => producto.codigo);
  const productosDisponibles = await db
    .select({
      id: productos.id,
      codigo: productos.codigo,
      existencia: productos.existencia,
    })
    .from(productos)
    .where(inArray(productos.codigo, codigos));

  for (let indice = existentes; indice < 50; indice += 1) {
    const seleccionados = productosDisponibles
      .filter((producto) => producto.existencia > 0)
      .sort((a, b) => b.existencia - a.existencia || a.id - b.id)
      .slice(0, 2);
    if (seleccionados.length < 2) {
      throw new Error("No hay stock suficiente para completar las facturas demo.");
    }

    const formaPago = (["contado", "tarjeta", "cuenta_corriente"] as const)[
      indice % 3
    ];
    const cliente =
      formaPago === "cuenta_corriente"
        ? clientesCuenta[indice % clientesCuenta.length]
        : clientesActivos[indice % clientesActivos.length];

    const factura = await crearFactura(vendedor, {
      clienteId: cliente.id,
      formaPago,
      ...(formaPago === "tarjeta"
        ? {
            tarjetaTipo: indice % 2 === 0 ? "debito" : "credito",
            tarjetaMarca: indice % 2 === 0 ? "Visa" : "Mastercard",
            tarjetaUltimos4: String(1000 + indice).slice(-4),
          }
        : {}),
      items: seleccionados.map((producto) => ({
        productoId: producto.id,
        cantidad: 1,
      })),
    });

    await db
      .update(facturas)
      .set({ fecha: fechaDeMuestra(indice) })
      .where(eq(facturas.id, factura.id));
    for (const seleccionado of seleccionados) {
      seleccionado.existencia -= 1;
    }
  }

  console.info(`Facturas demo aseguradas: ${Math.max(0, 50 - existentes)} nuevas.`);
}

async function asegurarPagosCuenta(
  admin: UsuarioSesion,
  clientesDisponibles: Awaited<ReturnType<typeof asegurarClientes>>,
) {
  const clientesCuenta = clientesDisponibles.filter(
    (cliente) => cliente.activo && cliente.cuentaCorriente,
  );
  const medios = ["efectivo", "transferencia", "tarjeta_debito"] as const;

  for (let indice = 0; indice < 5; indice += 1) {
    const observacion = `Pago a cuenta de prueba ${indice + 1}`;
    const [existente] = await db
      .select({ id: pagos.id })
      .from(pagos)
      .where(eq(pagos.observacion, observacion))
      .limit(1);
    if (existente) continue;

    for (let desplazamiento = 0; desplazamiento < clientesCuenta.length; desplazamiento += 1) {
      const cliente =
        clientesCuenta[(indice + desplazamiento) % clientesCuenta.length];
      const saldo = await calcularSaldoCliente(cliente.id);
      if (saldo <= 0) continue;

      await registrarPagoCuentaCorriente(admin, {
        clienteId: cliente.id,
        importe: Math.min(saldo, 500_000),
        medio: medios[indice % medios.length],
        observacion,
      });
      break;
    }
  }
}

async function asegurarAnulacion(
  admin: UsuarioSesion,
  clientesDisponibles: Awaited<ReturnType<typeof asegurarClientes>>,
) {
  const motivo = "Anulación de comprobante de demostración";
  const [anulacionExistente] = await db
    .select({ id: facturas.id })
    .from(facturas)
    .where(eq(facturas.motivoAnulacion, motivo))
    .limit(1);
  if (anulacionExistente) return;

  const idsCliente = clientesDisponibles.map((cliente) => cliente.id);
  const [factura] = await db
    .select({ id: facturas.id })
    .from(facturas)
    .where(
      and(
        eq(facturas.estado, "emitida"),
        inArray(facturas.clienteId, idsCliente),
      ),
    )
    .orderBy(asc(facturas.id))
    .limit(1);
  if (!factura) {
    throw new Error("No se encontró una factura demo para registrar la anulación.");
  }

  await anularFactura(admin, {
    id: factura.id,
    motivoAnulacion: motivo,
  });
}

async function seed() {
  console.info("Asegurando datos de muestra para Casa de Repuestos...");

  const { admin, vendedor } = await asegurarUsuarios();
  const categoriaIds = await asegurarCategorias(admin);
  await asegurarProductos(admin, categoriaIds);
  const clientesDisponibles = await asegurarClientes(admin);
  await asegurarFacturas(vendedor, clientesDisponibles);
  await asegurarPagosCuenta(admin, clientesDisponibles);
  await asegurarAnulacion(admin, clientesDisponibles);

  console.info(
    `Seed idempotente completo: ${nombresCategorias.length} categorías, ` +
      `${productosSemilla.length} productos, ${clientesSemilla.length} clientes y 50 facturas.`,
  );
}

seed().catch((error: unknown) => {
  console.error("Error ejecutando seed:", error);
  process.exitCode = 1;
});
