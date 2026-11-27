import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { guardarCliente, listarClientes } from "@/services/clients.service";

export const GET = withAuth(async (req) => {
  const params = req.nextUrl.searchParams;
  return NextResponse.json(await listarClientes({
    q: params.get("q"),
    conSaldo: params.get("conSaldo"),
    orden: params.get("orden"),
    estado: params.get("estado"),
  }));
});

export const POST = withAuth(async (req) =>
  NextResponse.json(await guardarCliente(await parseJsonBody(req)), { status: 201 }),
);
