import { z } from "zod";

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  });

export const reporteVentasSchema = z
  .object({
    desde: dateOnly.optional(),
    hasta: dateOnly.optional(),
  })
  .strict()
  .refine(
    ({ desde, hasta }) => !desde || !hasta || desde <= hasta,
    "La fecha inicial no puede ser posterior a la fecha final.",
  );
