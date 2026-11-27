import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { ApiError } from "@/lib/errors";
import { crearFacturaSchema } from "@/lib/schemas/comercial";
import { crearFactura, listarFacturas } from "@/services/facturas.service";

export const GET = withAuth(async (req) => {
  const searchParams = req.nextUrl.searchParams;
  const estadoParam = searchParams.get("estado");
  let estado: "emitida" | "anulada" | undefined;

  if (estadoParam !== null) {
    if (estadoParam !== "emitida" && estadoParam !== "anulada") {
      throw new ApiError(400, "VALIDACION", "Estado de factura inválido.");
    }
    estado = estadoParam;
  }

  const clienteParam = searchParams.get("clienteId");
  let clienteId: number | undefined;
  if (clienteParam !== null) {
    clienteId = Number(clienteParam);
    if (!Number.isInteger(clienteId) || clienteId <= 0) {
      throw new ApiError(400, "VALIDACION", "ID de cliente inválido.");
    }
  }

  const data = await listarFacturas({ estado, clienteId });
  return NextResponse.json({ data });
});

export const POST = withAuth(async (req, _ctx, user) => {
  const body = await parseJsonBody(req);
  const parsed = crearFacturaSchema.parse(body);
  const creada = await crearFactura(parsed, user.id);
  return NextResponse.json({ data: creada }, { status: 201 });
});
