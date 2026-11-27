import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { anularFactura } from "@/services/invoices.service";

type Context = { params: Promise<{ id: string }> };

export const POST = withAuth<Context>(async (req, { params }, user) => {
  const { id } = await params;
  return NextResponse.json(await anularFactura(user, id, await parseJsonBody(req)));
});
