import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import {
  actualizarCliente,
  obtenerClienteDetalle,
} from "@/services/clientes.service";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withAuth<RouteContext>(async (_req, ctx, user) => {
  const { id } = await ctx.params;
  const data = await obtenerClienteDetalle(user, { id });
  return NextResponse.json({ data });
});

export const PATCH = withAuth<RouteContext>(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const cambios = await parseJsonBody(req);
  const data = await actualizarCliente(user, { id, cambios });
  return NextResponse.json({ data });
});
