import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { anularFactura } from "@/services/facturas.service";

export const POST = withAuth<{ params: Promise<{ id: string }> }>(
  async (req, ctx, user) => {
    const { id } = await ctx.params;
    const body = await parseJsonBody(req);
    const anulada = await anularFactura(user, {
      id,
      ...(typeof body === "object" && body !== null ? body : {}),
    });
    return NextResponse.json({ data: anulada });
  },
);
