import { createHash } from "crypto";

/** Raw reset tokens are never stored — only their SHA-256 hash. */
export const hashResetToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** How long a reset link stays valid. */
export const RESET_TTL_MS = 30 * 60 * 1000;
