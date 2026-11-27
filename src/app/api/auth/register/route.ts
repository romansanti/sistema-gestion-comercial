import { NextResponse } from "next/server";
import { parseJsonBody, withPublic } from "@/lib/api-handler";
import { crearCookieSesion } from "@/lib/session";
import { registrarUsuario } from "@/services/auth.service";

export const POST = withPublic(async (req) => {
  const body = await parseJsonBody(req);
  const usuario = await registrarUsuario(body);
  await crearCookieSesion(usuario.id);
  return NextResponse.json(usuario, { status: 201 });
});
