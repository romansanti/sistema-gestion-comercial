import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { crearClienteSchema } from "@/lib/schemas/comercial";
import { crearCliente, listarClientes } from "@/services/clientes.service";

export const GET = withAuth(async (req) => {
  const searchParams = req.nextUrl.searchParams;
  const q = searchParams.get("q") ?? undefined;
  const soloCuentaCorriente =
    searchParams.get("cuentaCorriente") === "true";
  const soloActivos = searchParams.get("activos") === "true";

  const data = await listarClientes({
    q,
    soloCuentaCorriente,
    soloActivos,
  });
  return NextResponse.json({ data });
});

export const POST = withAuth(async (req) => {
  const body = await parseJsonBody(req);
  const parsed = crearClienteSchema.parse(body);
  const creado = await crearCliente(parsed);
  return NextResponse.json({ data: creado }, { status: 201 });
});
