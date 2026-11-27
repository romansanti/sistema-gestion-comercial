import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { crearFactura, listarFacturas } from "@/services/invoices.service";

export const GET = withAuth(async (req) => {
  const params = req.nextUrl.searchParams;
  return NextResponse.json(await listarFacturas({
    q: params.get("q"),
    desde: params.get("desde"),
    hasta: params.get("hasta"),
    formaPago: params.get("formaPago"),
    estado: params.get("estado"),
    clienteId: params.get("clienteId"),
    usuarioId: params.get("usuarioId"),
  }));
});

export const POST = withAuth(async (req, _ctx, user) =>
  NextResponse.json(await crearFactura(user, await parseJsonBody(req)), { status: 201 }),
);
