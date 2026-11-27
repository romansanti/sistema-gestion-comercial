import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { actualizarCategoria } from "@/services/management.service";

type Context = { params: Promise<{ id: string }> };

export const PUT = withAuth<Context>(async (req, { params }, user) => {
  const { id } = await params;
  return NextResponse.json(await actualizarCategoria(user, id, await parseJsonBody(req)));
});
