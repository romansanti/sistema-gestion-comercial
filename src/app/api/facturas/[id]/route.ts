import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-handler";
import { obtenerFactura } from "@/services/invoices.service";

type Context = { params: Promise<{ id: string }> };

export const GET = withAuth<Context>(async (_req, { params }) => {
  const { id } = await params;
  return NextResponse.json(await obtenerFactura(id));
});
