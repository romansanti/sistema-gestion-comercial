import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { crearFactura, listarFacturas } from "@/services/facturas.service";

export const GET = withAuth(async (req, _ctx, user) => {
  const filtros = Object.fromEntries(req.nextUrl.searchParams.entries());
  const data = await listarFacturas(user, filtros);
  return NextResponse.json({ data });
});

export const POST = withAuth(async (req, _ctx, user) => {
  const body = await parseJsonBody(req);
  const creada = await crearFactura(user, body);
  return NextResponse.json({ data: creada }, { status: 201 });
});
