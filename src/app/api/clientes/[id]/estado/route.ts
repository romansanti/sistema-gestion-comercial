import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { cambiarEstadoCliente } from "@/services/clients.service";

type Context = { params: Promise<{ id: string }> };

export const PATCH = withAuth<Context>(async (req, { params }) => {
  const { id } = await params;
  return NextResponse.json(await cambiarEstadoCliente(id, await parseJsonBody(req)));
});
