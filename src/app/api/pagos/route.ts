import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { registrarPagoSchema } from "@/lib/schemas/comercial";
import { registrarPagoCuentaCorriente } from "@/services/clientes.service";

export const POST = withAuth(async (req, _ctx, user) => {
  const body = await parseJsonBody(req);
  const parsed = registrarPagoSchema.parse(body);
  const resultado = await registrarPagoCuentaCorriente(parsed, user.id);
  return NextResponse.json({ data: resultado }, { status: 201 });
});
