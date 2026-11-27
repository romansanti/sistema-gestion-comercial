import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { ApiError } from "@/lib/errors";
import { anularFacturaSchema } from "@/lib/schemas/comercial";
import { exigirAdmin } from "@/lib/session";
import { anularFactura } from "@/services/facturas.service";

export const POST = withAuth<{ params: Promise<{ id: string }> }>(
  async (req, ctx, user) => {
    await exigirAdmin();
    const { id } = await ctx.params;
    const facturaId = Number(id);
    if (!Number.isInteger(facturaId) || facturaId <= 0) {
      throw new ApiError(400, "VALIDACION", "ID de factura inválido.");
    }

    const body = await parseJsonBody(req);
    const parsed = anularFacturaSchema.parse(body);
    const anulada = await anularFactura(
      facturaId,
      parsed.motivoAnulacion,
      user.id,
    );
    return NextResponse.json({ data: anulada });
  },
);
