import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import {
  obtenerCuentaCliente,
} from "@/services/clientes.service";
import { registrarPagoCuentaCorriente } from "@/services/pagos.service";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withAuth<RouteContext>(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const data = await obtenerCuentaCliente(user, {
    id,
    desde: req.nextUrl.searchParams.get("desde") ?? undefined,
    hasta: req.nextUrl.searchParams.get("hasta") ?? undefined,
  });
  return NextResponse.json({ data });
});

export const POST = withAuth<RouteContext>(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await parseJsonBody(req);
  const data = await registrarPagoCuentaCorriente(user, {
    ...(typeof body === "object" && body !== null ? body : {}),
    clienteId: Number(id),
  });
  return NextResponse.json({ data }, { status: 201 });
});
