import { NextResponse } from "next/server";
import { withPublic } from "@/lib/api-handler";
import { borrarCookieSesion } from "@/lib/session";

export const POST = withPublic(async () => {
  await borrarCookieSesion();
  return new NextResponse(null, { status: 204 });
});
