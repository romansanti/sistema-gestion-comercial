import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import {
  crearCategoria,
  listarCategorias,
} from "@/services/management.service";

export const GET = withAuth(async () =>
  NextResponse.json(await listarCategorias()),
);

export const POST = withAuth(async (req, _ctx, user) =>
  NextResponse.json(await crearCategoria(user, await parseJsonBody(req)), { status: 201 }),
);
