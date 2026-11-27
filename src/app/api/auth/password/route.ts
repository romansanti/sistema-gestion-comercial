import { NextResponse } from "next/server";
import { parseJsonBody, withAuth } from "@/lib/api-handler";
import { cambiarPasswordPropia } from "@/services/auth.service";

export const PUT = withAuth(async (req, _ctx, user) => {
  const body = await parseJsonBody(req);
  await cambiarPasswordPropia(user, body);
  return new NextResponse(null, { status: 204 });
});
