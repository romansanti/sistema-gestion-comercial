import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { ApiError } from "@/lib/errors";
import { crearProductoSchema } from "@/lib/schemas/productos";
import { exigirAdmin } from "@/lib/session";
import {
  crearProducto,
  listarProductos,
} from "@/services/productos.service";

export const GET = withAuth(async (req) => {
  const searchParams = req.nextUrl.searchParams;
  const q = searchParams.get("q") ?? undefined;
  const categoriaParam = searchParams.get("categoriaId");
  let categoriaId: number | undefined;

  if (categoriaParam !== null) {
    categoriaId = Number(categoriaParam);
    if (!Number.isInteger(categoriaId) || categoriaId <= 0) {
      throw new ApiError(400, "VALIDACION", "ID de categoría inválido.");
    }
  }

  const soloActivos = searchParams.get("activos") === "true";
  const stockBajo = searchParams.get("stockBajo") === "true";
  const data = await listarProductos({
    q,
    categoriaId,
    soloActivos,
    stockBajo,
  });

  return NextResponse.json({ data });
});

export const POST = withAuth(async (req, _ctx, user) => {
  await exigirAdmin();
  const body = await parseJsonBody(req);
  const parsed = crearProductoSchema.parse(body);
  const creado = await crearProducto(parsed, user.id);
  return NextResponse.json({ data: creado }, { status: 201 });
});
