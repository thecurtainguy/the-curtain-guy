import { createHash, randomBytes, timingSafeEqual } from "crypto";
import {
  UPLOAD_TOKEN_TTL_MS,
} from "@/lib/estimate-files-shared";

export * from "@/lib/estimate-files-shared";

export function hashUploadToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createUploadToken(): {
  token: string;
  hash: string;
  expiresAt: string;
} {
  const token = randomBytes(32).toString("hex");
  return {
    token,
    hash: hashUploadToken(token),
    expiresAt: new Date(Date.now() + UPLOAD_TOKEN_TTL_MS).toISOString(),
  };
}

export function verifyUploadToken(
  token: string,
  storedHash: string | null | undefined
): boolean {
  if (!token || !storedHash) return false;
  const incoming = Buffer.from(hashUploadToken(token), "hex");
  const stored = Buffer.from(storedHash, "hex");
  if (incoming.length !== stored.length) return false;
  return timingSafeEqual(incoming, stored);
}
