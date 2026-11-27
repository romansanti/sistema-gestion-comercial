import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { listarUsuarios, crearUsuario } from "@/services/usuarios.service";

export const GET = withAuth(async (req, _ctx, user) => {
  const search = req.nextUrl.searchParams;
  const data = await listarUsuarios(user, {
    page: search.get("page") ?? undefined,
    pageSize: search.get("pageSize") ?? undefined,
  });
  return NextResponse.json({ data });
});

export const POST = withAuth(async (req, _ctx, user) => {
  const body = await parseJsonBody(req);
  const created = await crearUsuario(user, body);
  return NextResponse.json({ data: created }, { status: 201 });
});
