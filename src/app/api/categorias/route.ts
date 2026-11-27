import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import {
  crearCategoria,
  listarCategorias,
} from "@/services/categorias.service";

export const GET = withAuth(async (req, _ctx, user) => {
  const data = await listarCategorias(user, {
    activas: req.nextUrl.searchParams.get("activas") ?? undefined,
  });
  return NextResponse.json({ data });
});

export const POST = withAuth(async (req, _ctx, user) => {
  const body = await parseJsonBody(req);
  const creada = await crearCategoria(user, body);
  return NextResponse.json({ data: creada }, { status: 201 });
});
