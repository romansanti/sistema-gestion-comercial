const TZ_AR = "America/Argentina/Buenos_Aires";

/** Convierte centavos enteros (ej. 1234550) a "$ 12.345,50" */
export function formatearMoneda(centavos: number): string {
  const pesos = centavos / 100;
  const formateado = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(pesos);
  return `$ ${formateado}`;
}

/** Convierte centavos enteros a una cadena decimal para campos de importe. */
export function centavosAValorInput(centavos: number): string {
  if (!Number.isSafeInteger(centavos)) {
    throw new RangeError("El importe debe ser un entero seguro de centavos.");
  }

  const absoluto = Math.abs(centavos);
  const signo = centavos < 0 ? "-" : "";
  const pesos = Math.floor(absoluto / 100);
  const centimos = String(absoluto % 100).padStart(2, "0");
  return `${signo}${pesos}.${centimos}`;
}

/** Formatea punto de venta y número a "0001-00000001" */
export function formatearNumeroFactura(
  puntoVenta: number,
  numero: number,
): string {
  const pv = String(puntoVenta).padStart(4, "0");
  const nro = String(numero).padStart(8, "0");
  return `${pv}-${nro}`;
}

/** Formatea número de recibo a "R 0001-00000001" */
export function formatearNumeroRecibo(
  puntoVenta: number,
  numero: number,
): string {
  return `R ${formatearNumeroFactura(puntoVenta, numero)}`;
}

/** Formatea fecha ISO UTC a "dd/mm/aaaa" en hora de Argentina */
export function formatearFecha(isoUtc: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ_AR,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(isoUtc));
}

/** Formatea fecha ISO UTC a "dd/mm/aaaa HH:mm" en hora de Argentina */
export function formatearFechaHora(isoUtc: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ_AR,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoUtc));
}

/** Devuelve fecha actual en ISO 8601 UTC sin milisegundos */
export function ahoraIsoUtc(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}
