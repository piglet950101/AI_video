import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { isValidCronRequest } from "@/lib/utils";
import { refreshExpiringTokens } from "@/lib/meta";

export async function GET(req: NextRequest) {
  if (!isValidCronRequest(req, env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await refreshExpiringTokens(7);
  return NextResponse.json({ ok: true });
}
