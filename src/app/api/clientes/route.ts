import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { crearCliente, listarClientes } from "@/services/clientes.service";

export const GET = withAuth(async (req, _ctx, user) => {
  const searchParams = req.nextUrl.searchParams;
  const data = await listarClientes(user, {
    q: searchParams.get("q") ?? undefined,
    cuentaCorriente: searchParams.get("cuentaCorriente") ?? undefined,
    activo: searchParams.get("activo") ?? undefined,
    activos: searchParams.get("activos") ?? undefined,
    conDeuda: searchParams.get("conDeuda") ?? undefined,
    ordenar: searchParams.get("ordenar") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });
  return NextResponse.json({ data });
});

export const POST = withAuth(async (req, _ctx, user) => {
  const body = await parseJsonBody(req);
  const creado = await crearCliente(user, body);
  return NextResponse.json({ data: creado }, { status: 201 });
});
