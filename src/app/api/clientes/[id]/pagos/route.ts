import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { listarPagosCliente, registrarPago } from "@/services/clients.service";

type Context = { params: Promise<{ id: string }> };

export const GET = withAuth<Context>(async (_req, { params }) => {
  const { id } = await params;
  return NextResponse.json(await listarPagosCliente(id));
});

export const POST = withAuth<Context>(async (req, { params }, user) => {
  const { id } = await params;
  return NextResponse.json(await registrarPago(user, id, await parseJsonBody(req)), { status: 201 });
});
