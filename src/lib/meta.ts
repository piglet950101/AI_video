import { env } from "./env";
import { log } from "./logger";
import { encrypt, decrypt, type Ciphertext } from "./encryption";
import { prisma } from "./db";

/**
 * Meta Graph API wrapper — Instagram Content Publishing + Facebook Page publishing.
 * Docs:
 *   IG: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
 *   FB: https://developers.facebook.com/docs/pages-api/posts
 */

const BASE = () => `https://graph.facebook.com/${env.META_GRAPH_VERSION}`;

interface GraphError {
  error: { message: string; type: string; code: number; fbtrace_id?: string };
}

async function call<T>(
  pathOrUrl: string,
  init: RequestInit & { token?: string; params?: Record<string, string | number | undefined> } = {},
): Promise<T> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(init.params ?? {})) {
    if (v !== undefined && v !== null) params.set(k, String(v));
  }
  if (init.token) params.set("access_token", init.token);

  const qs = params.toString();
  const base = pathOrUrl.startsWith("http") ? pathOrUrl : `${BASE()}${pathOrUrl}`;
  const sep = base.includes("?") ? "&" : "?";
  const url = qs ? `${base}${sep}${qs}` : base;

  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    body: init.body,
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok || (json as GraphError).error) {
    const err = (json as GraphError).error;
    log.error("meta graph error", {
      url: url.replace(/access_token=[^&]+/, "access_token=REDACTED"),
      status: res.status,
      err,
    });
    throw new Error(
      `Meta Graph ${res.status}: ${err?.message ?? text.slice(0, 300)} [code=${err?.code}]`,
    );
  }
  // Surface X-App-Usage for rate-limit monitoring
  const usage = res.headers.get("x-app-usage");
  if (usage) log.debug("meta x-app-usage", { usage });
  return json as T;
}

// ============================================================
// OAuth
// ============================================================

export function buildOAuthUrl(state: string): string {
  if (!env.META_APP_ID) throw new Error("META_APP_ID not configured");
  const scopes = [
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_posts",
    "pages_manage_metadata",
    "instagram_basic",
    "instagram_content_publish",
    "instagram_manage_insights",
    "business_management",
  ].join(",");

  const params = new URLSearchParams({
    client_id: env.META_APP_ID,
    redirect_uri: env.META_OAUTH_REDIRECT_URI ?? `${env.NEXT_PUBLIC_APP_URL}/api/meta/oauth/callback`,
    scope: scopes,
    response_type: "code",
    state,
  });
  return `https://www.facebook.com/${env.META_GRAPH_VERSION}/dialog/oauth?${params}`;
}

export async function exchangeCodeForUserToken(code: string): Promise<string> {
  if (!env.META_APP_ID || !env.META_APP_SECRET) {
    throw new Error("Meta app credentials missing");
  }
  const json = await call<{ access_token: string; expires_in?: number }>("/oauth/access_token", {
    params: {
      client_id: env.META_APP_ID,
      client_secret: env.META_APP_SECRET,
      redirect_uri:
        env.META_OAUTH_REDIRECT_URI ?? `${env.NEXT_PUBLIC_APP_URL}/api/meta/oauth/callback`,
      code,
    },
  });
  return json.access_token;
}

export async function exchangeShortLivedForLongLived(shortToken: string): Promise<{
  token: string;
  expiresInSec: number;
}> {
  const json = await call<{ access_token: string; expires_in?: number }>(
    "/oauth/access_token",
    {
      params: {
        grant_type: "fb_exchange_token",
        client_id: env.META_APP_ID,
        client_secret: env.META_APP_SECRET,
        fb_exchange_token: shortToken,
      },
    },
  );
  return {
    token: json.access_token,
    // Meta returns ~5184000s (60d) for page tokens when requested correctly.
    expiresInSec: json.expires_in ?? 60 * 24 * 60 * 60,
  };
}

interface MePagesResponse {
  data: Array<{
    id: string;
    name: string;
    access_token: string;
    instagram_business_account?: { id: string; username?: string };
  }>;
}

/**
 * Resolves the Page and (optionally) the linked Instagram Business account.
 * Returns the Page Access Token — this is what you store, NOT the user token.
 */
export async function resolvePage(userToken: string): Promise<{
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  igBusinessId?: string;
  igUsername?: string;
}> {
  const json = await call<MePagesResponse>("/me/accounts", {
    token: userToken,
    params: { fields: "id,name,access_token,instagram_business_account{id,username}" },
  });
  if (!json.data.length) throw new Error("No Facebook Pages found on this user");
  // If multiple, pick the first with an IG linked; fallback to first.
  const withIg = json.data.find((p) => p.instagram_business_account);
  const page = withIg ?? json.data[0];
  return {
    pageId: page.id,
    pageName: page.name,
    pageAccessToken: page.access_token,
    igBusinessId: page.instagram_business_account?.id,
    igUsername: page.instagram_business_account?.username,
  };
}

// ============================================================
// Token storage (encrypted at rest)
// ============================================================

export async function saveUserMetaToken(
  userId: string,
  pageAccessToken: string,
  expiresInSec: number,
  pageId: string,
  pageName: string,
  igBusinessId: string | undefined,
  igUsername: string | undefined,
) {
  const ct = encrypt(pageAccessToken);
  await prisma.user.update({
    where: { id: userId },
    data: {
      metaTokenCipher: ct.cipher,
      metaTokenIv: ct.iv,
      metaTokenTag: ct.tag,
      metaTokenExpiresAt: new Date(Date.now() + expiresInSec * 1000),
      metaPageId: pageId,
      metaPageName: pageName,
      igBusinessId,
      igUsername,
    },
  });
}

export async function loadUserMetaToken(userId: string): Promise<string | null> {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u?.metaTokenCipher || !u.metaTokenIv || !u.metaTokenTag) return null;
  const ct: Ciphertext = {
    cipher: u.metaTokenCipher,
    iv: u.metaTokenIv,
    tag: u.metaTokenTag,
  };
  return decrypt(ct);
}

// ============================================================
// Publishing — Instagram Reels
// ============================================================

interface PublishIgReelArgs {
  igBusinessId: string;
  videoUrl: string; // public https URL (R2)
  caption: string;
  pageAccessToken: string;
  shareToFeed?: boolean;
}

export async function publishIgReel(args: PublishIgReelArgs): Promise<string> {
  // 1) create media container
  const created = await call<{ id: string }>(`/${args.igBusinessId}/media`, {
    method: "POST",
    token: args.pageAccessToken,
    params: {
      media_type: "REELS",
      video_url: args.videoUrl,
      caption: args.caption,
      share_to_feed: args.shareToFeed ?? true,
    },
  });

  // 2) poll until FINISHED
  const creationId = created.id;
  const startedAt = Date.now();
  const timeoutMs = 5 * 60 * 1000;
  while (true) {
    const s = await call<{ status_code: string; status?: string }>(
      `/${creationId}`,
      { token: args.pageAccessToken, params: { fields: "status_code,status" } },
    );
    if (s.status_code === "FINISHED") break;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") {
      throw new Error(`IG media container ${s.status_code}: ${s.status ?? ""}`);
    }
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error("IG media container polling timed out after 5 min");
    }
    await new Promise((r) => setTimeout(r, 5000));
  }

  // 3) publish
  const pub = await call<{ id: string }>(`/${args.igBusinessId}/media_publish`, {
    method: "POST",
    token: args.pageAccessToken,
    params: { creation_id: creationId },
  });
  return pub.id;
}

// ============================================================
// Publishing — Facebook Page video
// ============================================================

interface PublishFbVideoArgs {
  pageId: string;
  pageAccessToken: string;
  videoUrl: string;
  description: string;
}

export async function publishFbVideo(args: PublishFbVideoArgs): Promise<string> {
  // Facebook accepts file_url for videos directly (no container/publish split).
  const json = await call<{ id: string }>(`/${args.pageId}/videos`, {
    method: "POST",
    token: args.pageAccessToken,
    params: {
      file_url: args.videoUrl,
      description: args.description,
    },
  });
  return json.id;
}

// ============================================================
// Publishing — Instagram Carousel (portfolio)
// ============================================================

export async function publishIgCarousel(args: {
  igBusinessId: string;
  imageUrls: string[];
  caption: string;
  pageAccessToken: string;
}): Promise<string> {
  if (args.imageUrls.length < 2 || args.imageUrls.length > 10) {
    throw new Error("Carousel requires 2–10 images");
  }
  // 1) create a container per image with is_carousel_item=true
  const children: string[] = [];
  for (const url of args.imageUrls) {
    const c = await call<{ id: string }>(`/${args.igBusinessId}/media`, {
      method: "POST",
      token: args.pageAccessToken,
      params: { image_url: url, is_carousel_item: true },
    });
    children.push(c.id);
  }
  // 2) create the parent carousel container
  const parent = await call<{ id: string }>(`/${args.igBusinessId}/media`, {
    method: "POST",
    token: args.pageAccessToken,
    params: {
      media_type: "CAROUSEL",
      children: children.join(","),
      caption: args.caption,
    },
  });
  // 3) publish parent
  const pub = await call<{ id: string }>(`/${args.igBusinessId}/media_publish`, {
    method: "POST",
    token: args.pageAccessToken,
    params: { creation_id: parent.id },
  });
  return pub.id;
}

// ============================================================
// Insights
// ============================================================

export interface IgMediaInsights {
  impressions?: number;
  reach?: number;
  saved?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  video_views?: number;
  total_interactions?: number;
  ig_reels_avg_watch_time?: number;
  ig_reels_video_view_total_time?: number;
}

export async function fetchIgInsights(
  mediaId: string,
  pageAccessToken: string,
): Promise<IgMediaInsights> {
  const metricsList =
    "impressions,reach,saved,likes,comments,shares,total_interactions,video_views,ig_reels_avg_watch_time,ig_reels_video_view_total_time";
  const json = await call<{ data: Array<{ name: string; values: Array<{ value: number }> }> }>(
    `/${mediaId}/insights`,
    { token: pageAccessToken, params: { metric: metricsList } },
  );

  const out: IgMediaInsights = {};
  for (const m of json.data ?? []) {
    const v = m.values?.[0]?.value;
    if (typeof v === "number") (out as Record<string, number>)[m.name] = v;
  }
  return out;
}

export async function fetchFbVideoInsights(
  videoId: string,
  pageAccessToken: string,
): Promise<{ total_video_views?: number; total_video_avg_time_watched?: number }> {
  const json = await call<{ data: Array<{ name: string; values: Array<{ value: number }> }> }>(
    `/${videoId}/video_insights`,
    { token: pageAccessToken, params: { metric: "total_video_views,total_video_avg_time_watched" } },
  );
  const out: Record<string, number> = {};
  for (const m of json.data ?? []) {
    const v = m.values?.[0]?.value;
    if (typeof v === "number") out[m.name] = v;
  }
  return out;
}

// ============================================================
// Token refresh
// ============================================================

export async function refreshExpiringTokens(bufferDays = 7) {
  const threshold = new Date(Date.now() + bufferDays * 24 * 60 * 60 * 1000);
  const users = await prisma.user.findMany({
    where: {
      metaTokenCipher: { not: null },
      metaTokenExpiresAt: { lte: threshold },
    },
  });
  for (const u of users) {
    try {
      const current = await loadUserMetaToken(u.id);
      if (!current) continue;
      const { token, expiresInSec } = await exchangeShortLivedForLongLived(current);
      const ct = encrypt(token);
      await prisma.user.update({
        where: { id: u.id },
        data: {
          metaTokenCipher: ct.cipher,
          metaTokenIv: ct.iv,
          metaTokenTag: ct.tag,
          metaTokenExpiresAt: new Date(Date.now() + expiresInSec * 1000),
        },
      });
      log.info("meta token refreshed", { userId: u.id });
    } catch (e) {
      log.error("meta token refresh failed", { userId: u.id, error: String(e) });
    }
  }
}
