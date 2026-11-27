import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-handler";
import { listarMovimientosStock } from "@/services/management.service";

export const GET = withAuth(async (req) => {
  const rawLimit = Number(req.nextUrl.searchParams.get("limit") ?? 100);
  return NextResponse.json(await listarMovimientosStock({
    limit: Number.isSafeInteger(rawLimit) ? rawLimit : 100,
  }));
});
