import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { obtenerCliente, guardarCliente } from "@/services/clients.service";

type Context = { params: Promise<{ id: string }> };

export const GET = withAuth<Context>(async (_req, { params }) => {
  const { id } = await params;
  return NextResponse.json(await obtenerCliente(id));
});

export const PUT = withAuth<Context>(async (req, { params }) => {
  const { id } = await params;
  return NextResponse.json(await guardarCliente(await parseJsonBody(req), id));
});
