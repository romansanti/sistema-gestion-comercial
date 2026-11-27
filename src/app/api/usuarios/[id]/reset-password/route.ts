import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { restablecerPasswordUsuario } from "@/services/management.service";

type Context = { params: Promise<{ id: string }> };

export const POST = withAuth<Context>(async (req, { params }, user) => {
  const { id } = await params;
  const body = req.body ? await parseJsonBody(req) : undefined;
  return NextResponse.json(await restablecerPasswordUsuario(user, id, body));
});
