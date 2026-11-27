import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { registrarPagoCuentaCorriente } from "@/services/pagos.service";

export const POST = withAuth(async (req, _ctx, user) => {
  const body = await parseJsonBody(req);
  const data = await registrarPagoCuentaCorriente(user, body);
  return NextResponse.json({ data }, { status: 201 });
});
