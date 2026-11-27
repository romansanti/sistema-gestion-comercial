import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-handler";
import { borrarCookieSesion } from "@/lib/session";

export const POST = withAuth(async () => {
  await borrarCookieSesion();
  return new NextResponse(null, { status: 204 });
});
