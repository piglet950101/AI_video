import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { buildOAuthUrl } from "@/lib/meta";
import { requireUser } from "@/lib/session";

/**
 * Kicks off Meta OAuth. The user clicks "Connect Instagram" in /settings,
 * which links here. We redirect to Facebook's OAuth dialog. All auth happens
 * on the user's own device.
 */
export async function GET() {
  await requireUser();
  const state = crypto.randomBytes(16).toString("hex");
  const url = buildOAuthUrl(state);
  const res = NextResponse.redirect(url);
  res.cookies.set("meta_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
