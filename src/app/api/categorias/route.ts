import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { crearCategoriaSchema } from "@/lib/schemas/productos";
import { exigirAdmin } from "@/lib/session";
import {
  crearCategoria,
  listarCategorias,
} from "@/services/categorias.service";

export const GET = withAuth(async (req) => {
  const soloActivas = req.nextUrl.searchParams.get("activas") === "true";
  const data = await listarCategorias(soloActivas);
  return NextResponse.json({ data });
});

export const POST = withAuth(async (req) => {
  await exigirAdmin();
  const body = await parseJsonBody(req);
  const parsed = crearCategoriaSchema.parse(body);
  const creada = await crearCategoria(parsed.nombre);
  return NextResponse.json({ data: creada }, { status: 201 });
});
