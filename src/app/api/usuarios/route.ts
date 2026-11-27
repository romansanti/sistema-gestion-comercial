import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { crearUsuario, listarUsuarios } from "@/services/management.service";

export const GET = withAuth(async (_req, _ctx, user) =>
  NextResponse.json(await listarUsuarios(user)),
);

export const POST = withAuth(async (req, _ctx, user) =>
  NextResponse.json(await crearUsuario(user, await parseJsonBody(req)), { status: 201 }),
);
