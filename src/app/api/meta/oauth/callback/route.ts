import { NextResponse, type NextRequest } from "next/server";
import {
  exchangeCodeForUserToken,
  exchangeShortLivedForLongLived,
  resolvePage,
  saveUserMetaToken,
} from "@/lib/meta";
import { prisma } from "@/lib/db";
import { log } from "@/lib/logger";
import { requireUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { email } = await requireUser();
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u) return NextResponse.redirect(new URL("/login", req.url));

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDesc = url.searchParams.get("error_description");

  if (error) {
    log.warn("meta oauth denied", { error, errorDesc });
    return NextResponse.redirect(new URL(`/settings?meta_error=${encodeURIComponent(error)}`, req.url));
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/settings?meta_error=missing_code", req.url));
  }

  const expectedState = req.cookies.get("meta_oauth_state")?.value;
  if (!expectedState || expectedState !== state) {
    return NextResponse.redirect(new URL("/settings?meta_error=state_mismatch", req.url));
  }

  try {
    const shortUserToken = await exchangeCodeForUserToken(code);
    const longUserToken = await exchangeShortLivedForLongLived(shortUserToken);
    // Page Access Tokens derived from a long-lived User Access Token are themselves
    // long-lived and have NO expiration (Meta docs). Do not fb_exchange_token again.
    const page = await resolvePage(longUserToken.token);

    // Use a far-future date since Page tokens derived this way don't expire.
    const TEN_YEARS_SEC = 10 * 365 * 24 * 60 * 60;
    await saveUserMetaToken(
      u.id,
      page.pageAccessToken,
      TEN_YEARS_SEC,
      page.pageId,
      page.pageName,
      page.igBusinessId,
      page.igUsername,
    );

    log.info("meta connected", {
      userId: u.id,
      pageId: page.pageId,
      igBusinessId: page.igBusinessId,
    });

    const res = NextResponse.redirect(new URL("/settings?meta_connected=1", req.url));
    res.cookies.delete("meta_oauth_state");
    return res;
  } catch (e) {
    log.error("meta oauth failed", { error: String(e) });
    return NextResponse.redirect(
      new URL(`/settings?meta_error=${encodeURIComponent("exchange_failed")}`, req.url),
    );
  }
}
