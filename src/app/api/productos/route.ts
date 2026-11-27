import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import {
  crearProducto,
  listarProductos,
} from "@/services/productos.service";

export const GET = withAuth(async (req, _ctx, user) => {
  const searchParams = req.nextUrl.searchParams;
  const result = await listarProductos(user, {
    q: searchParams.get("q") ?? undefined,
    categoriaId: searchParams.get("categoriaId") ?? undefined,
    activo: searchParams.get("activo") ?? undefined,
    activos: searchParams.get("activos") ?? undefined,
    bajoMinimo: searchParams.get("bajoMinimo") ?? undefined,
    stockBajo: searchParams.get("stockBajo") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });

  return NextResponse.json({ data: result });
});

export const POST = withAuth(async (req, _ctx, user) => {
  const body = await parseJsonBody(req);
  const creado = await crearProducto(user, body);
  return NextResponse.json({ data: creado }, { status: 201 });
});
