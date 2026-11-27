import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { cambiarEstadoUsuario } from "@/services/management.service";

type Context = { params: Promise<{ id: string }> };

export const PATCH = withAuth<Context>(async (req, { params }, user) => {
  const { id } = await params;
  return NextResponse.json(await cambiarEstadoUsuario(user, id, await parseJsonBody(req)));
});
