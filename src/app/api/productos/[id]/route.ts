import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import {
  guardarProducto,
  obtenerProducto,
} from "@/services/management.service";

type Context = { params: Promise<{ id: string }> };

export const GET = withAuth<Context>(async (_req, { params }) => {
  const { id } = await params;
  return NextResponse.json(await obtenerProducto(id));
});

export const PUT = withAuth<Context>(async (req, { params }, user) => {
  const { id } = await params;
  return NextResponse.json(await guardarProducto(user, await parseJsonBody(req), id));
});
