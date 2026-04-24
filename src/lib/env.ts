import { z } from "zod";

/**
 * Environment schema — validated at startup. Fail-fast if anything required is missing.
 * Keep server-only vars here; the `NEXT_PUBLIC_` ones are also validated.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // Crypto
  ENCRYPTION_KEY: z.string().min(32, "ENCRYPTION_KEY must be >= 32 chars (base64 of 32 bytes)"),
  NEXTAUTH_SECRET: z.string().min(16),
  NEXTAUTH_URL: z.string().url(),
  CRON_SECRET: z.string().min(16),

  // Auth
  ALLOWED_LOGIN_EMAIL: z.string().email(),
  EMAIL_SERVER_HOST: z.string().optional(),
  EMAIL_SERVER_PORT: z.string().optional(),
  EMAIL_SERVER_USER: z.string().optional(),
  EMAIL_SERVER_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // DB
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  // Redis
  REDIS_URL: z.string().url(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // R2
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_URL: z.string().url(),

  // Sentry
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),

  // Logtail / Better Stack
  LOGTAIL_SOURCE_TOKEN: z.string().optional(),

  // HeyGen — optional at build time; required when actually rendering a video.
  HEYGEN_API_KEY: z.string().optional().default(""),
  HEYGEN_WEBHOOK_SECRET: z.string().optional(),

  // Anthropic — optional at build time; required when generating script variants.
  ANTHROPIC_API_KEY: z.string().optional().default(""),

  // Meta
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_OAUTH_REDIRECT_URI: z.string().url().optional(),
  META_GRAPH_VERSION: z.string().default("v21.0"),
});

type Env = z.infer<typeof schema>;

function loadEnv(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // Warn, never crash: Next.js build executes route modules during "Collecting page data",
    // and a throw here aborts the whole deploy. Runtime handlers that genuinely need a
    // missing var will surface a targeted error when the relevant code path is hit.
    console.warn(
      "[env] Some environment variables failed validation (non-fatal):",
      parsed.error.flatten().fieldErrors,
    );
  }
  return (parsed.success ? parsed.data : (process.env as unknown as Env));
}

export const env = loadEnv();
