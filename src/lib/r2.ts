import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

export function publicUrl(key: string): string {
  // R2_PUBLIC_URL must be set to the r2.dev subdomain OR a custom domain.
  // Meta Graph fetches media by public URL — this MUST be reachable externally.
  return `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
}

export async function uploadBuffer(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return publicUrl(key);
}

export async function presignUpload(
  key: string,
  contentType: string,
  expiresInSec = 600,
): Promise<string> {
  return getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: expiresInSec },
  );
}

export async function presignDownload(key: string, expiresInSec = 600): Promise<string> {
  return getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
    { expiresIn: expiresInSec },
  );
}

export async function remove(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }));
}

export function keyForVideo(userId: string, videoId: string, ext = "mp4"): string {
  return `videos/${userId}/${videoId}.${ext}`;
}

export function keyForThumbnail(userId: string, videoId: string): string {
  return `thumbnails/${userId}/${videoId}.jpg`;
}

export function keyForPortfolio(userId: string, imageId: string, ext = "jpg"): string {
  return `portfolio/${userId}/${imageId}.${ext}`;
}
