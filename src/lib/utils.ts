import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Returns true when the cron secret in the Authorization header matches.
 * Vercel Cron signs with "Bearer <CRON_SECRET>" when configured in vercel.json.
 */
export function isValidCronRequest(req: Request, expected: string): boolean {
  const auth = req.headers.get("authorization");
  if (!auth) return false;
  return auth === `Bearer ${expected}`;
}

export function absoluteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Builds the public /go/[postId] short link with UTM tags.
 */
export function buildGoLink(postId: string): string {
  return absoluteUrl(`/go/${postId}`);
}

export function buildUtmUrl(
  targetUrl: string,
  source: string,
  medium: string,
  campaign: string,
  content: string,
): string {
  const u = new URL(targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`);
  u.searchParams.set("utm_source", source);
  u.searchParams.set("utm_medium", medium);
  u.searchParams.set("utm_campaign", campaign);
  u.searchParams.set("utm_content", content);
  return u.toString();
}

export function formatBRT(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Compute the next scheduled slot respecting preferred hours (BRT).
 * Returns a Date in UTC (DB timezone).
 */
export function nextScheduledSlot(
  preferredHoursBRT: number[],
  afterUtc: Date = new Date(),
): Date {
  // BRT = UTC-3 year-round (no DST since 2019)
  const brtOffsetMs = -3 * 60 * 60 * 1000;
  const nowBrt = new Date(afterUtc.getTime() + brtOffsetMs);
  const day = new Date(
    Date.UTC(
      nowBrt.getUTCFullYear(),
      nowBrt.getUTCMonth(),
      nowBrt.getUTCDate(),
      0, 0, 0, 0,
    ),
  );
  for (let d = 0; d < 7; d++) {
    for (const h of preferredHoursBRT.slice().sort((a, b) => a - b)) {
      const candidateBrt = new Date(day.getTime() + d * 86_400_000 + h * 3_600_000);
      const candidateUtc = new Date(candidateBrt.getTime() - brtOffsetMs);
      if (candidateUtc.getTime() > afterUtc.getTime()) return candidateUtc;
    }
  }
  return new Date(afterUtc.getTime() + 24 * 3600 * 1000);
}
