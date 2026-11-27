import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import {
  crearMovimientoStock,
  listarMovimientosStock,
} from "@/services/management.service";
import { validarId } from "@/services/common.service";

type Context = { params: Promise<{ id: string }> };

export const GET = withAuth<Context>(async (_req, { params }) => {
  const { id } = await params;
  return NextResponse.json(await listarMovimientosStock({ productoId: validarId(id) }));
});

export const POST = withAuth<Context>(async (req, { params }, user) => {
  const { id } = await params;
  return NextResponse.json(await crearMovimientoStock(user, id, await parseJsonBody(req)), { status: 201 });
});
