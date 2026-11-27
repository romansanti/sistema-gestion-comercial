import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-handler";

export const GET = withAuth(async (_req, _ctx, user) => {
  return NextResponse.json(user, { status: 200 });
});
