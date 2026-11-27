import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { listarProductos, guardarProducto } from "@/services/management.service";

export const GET = withAuth(async (req) => {
  const params = req.nextUrl.searchParams;
  return NextResponse.json(await listarProductos({
    q: params.get("q"),
    categoriaId: params.get("categoriaId"),
    bajoMinimo: params.get("bajoMinimo"),
    estado: params.get("estado"),
  }));
});

export const POST = withAuth(async (req, _ctx, user) =>
  NextResponse.json(await guardarProducto(user, await parseJsonBody(req)), { status: 201 }),
);
