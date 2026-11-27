import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-handler";
import { obtenerDashboard } from "@/services/invoices.service";

export const GET = withAuth(async () =>
  NextResponse.json(await obtenerDashboard()),
);
