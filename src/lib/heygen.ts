import { env } from "./env";
import { log } from "./logger";

/**
 * Minimal HeyGen API v2 wrapper — just the endpoints we need for Phase 1.
 * Docs: https://docs.heygen.com/reference
 */

const BASE = "https://api.heygen.com";

async function call<T>(
  path: string,
  init: RequestInit & { version?: "v1" | "v2" } = {},
): Promise<T> {
  const version = init.version ?? "v2";
  const url = `${BASE}/${version}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "X-Api-Key": env.HEYGEN_API_KEY,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    log.error("heygen api error", { path, status: res.status, body: text.slice(0, 500) });
    throw new Error(`HeyGen ${res.status}: ${text.slice(0, 300)}`);
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export interface HeyGenVideoResponse {
  data: { video_id: string };
}

export interface HeyGenStatusResponse {
  code: number;
  data: {
    id: string;
    status: "waiting" | "processing" | "completed" | "failed";
    video_url?: string;
    thumbnail_url?: string;
    duration?: number;
    error?: { detail?: string; message?: string };
  };
}

export type Aspect = "9:16" | "1:1" | "16:9";
const DIMENSIONS: Record<Aspect, { width: number; height: number }> = {
  "9:16": { width: 720, height: 1280 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1280, height: 720 },
};

interface GenerateOptions {
  avatarId: string;
  voiceId: string;
  text: string;
  aspect: Aspect;
  callbackUrl?: string;
  title?: string;
}

/**
 * Submit a new avatar-video generation job. Returns HeyGen's video_id to poll or webhook.
 */
export async function generateVideo(opts: GenerateOptions): Promise<string> {
  const dims = DIMENSIONS[opts.aspect];
  const body = {
    video_inputs: [
      {
        character: {
          type: "avatar",
          avatar_id: opts.avatarId,
          avatar_style: "normal",
        },
        voice: {
          type: "text",
          input_text: opts.text,
          voice_id: opts.voiceId,
        },
      },
    ],
    dimension: dims,
    title: opts.title ?? "ErroZero clip",
    callback_url: opts.callbackUrl,
  };

  const json = await call<HeyGenVideoResponse>("/video/generate", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return json.data.video_id;
}

export async function getVideoStatus(videoId: string): Promise<HeyGenStatusResponse> {
  return call<HeyGenStatusResponse>(`/video_status.get?video_id=${encodeURIComponent(videoId)}`, {
    version: "v1",
    method: "GET",
  });
}

export async function downloadVideo(videoUrl: string): Promise<Buffer> {
  const res = await fetch(videoUrl);
  if (!res.ok) throw new Error(`HeyGen download failed: ${res.status}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

/**
 * Estimate render duration for UI display.
 * Rule of thumb: ~160 words/minute at conversational pace in pt-BR.
 */
export function estimateDurationSec(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.round((words / 160) * 60);
}
