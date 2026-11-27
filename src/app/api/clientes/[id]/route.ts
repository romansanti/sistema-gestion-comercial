import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { ApiError } from "@/lib/errors";
import { actualizarClienteSchema } from "@/lib/schemas/comercial";
import { exigirAdmin } from "@/lib/session";
import {
  actualizarCliente,
  obtenerClienteDetalle,
} from "@/services/clientes.service";

export const GET = withAuth<{ params: Promise<{ id: string }> }>(
  async (_req, ctx) => {
    const { id } = await ctx.params;
    const clienteId = Number(id);
    if (!Number.isInteger(clienteId) || clienteId <= 0) {
      throw new ApiError(400, "VALIDACION", "ID de cliente inválido.");
    }

    const data = await obtenerClienteDetalle(clienteId);
    return NextResponse.json({ data });
  },
);

export const PATCH = withAuth<{ params: Promise<{ id: string }> }>(
  async (req, ctx) => {
    await exigirAdmin();
    const { id } = await ctx.params;
    const clienteId = Number(id);
    if (!Number.isInteger(clienteId) || clienteId <= 0) {
      throw new ApiError(400, "VALIDACION", "ID de cliente inválido.");
    }

    const body = await parseJsonBody(req);
    const parsed = actualizarClienteSchema.parse(body);
    const actualizado = await actualizarCliente(clienteId, parsed);
    return NextResponse.json({ data: actualizado });
  },
);
