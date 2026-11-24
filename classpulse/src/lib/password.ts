import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { z } from "zod";

export const BCRYPT_COST = 12;

export const hashPassword = (pw: string) => bcrypt.hash(pw, BCRYPT_COST);

/** Compared against when an email is unknown, so response time doesn't reveal which emails exist. */
export const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_COST);

// No look-alike characters (0/O, 1/l/I) so a password read off a screen or paper is easy to type.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** Cryptographically random one-time password. The user must change it at first login. */
export function generateTempPassword(length = 12): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/** Policy for passwords people choose themselves. */
export const newPasswordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128)
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number")
  .refine((pw) => new TextEncoder().encode(pw).length <= 72, "Use at most 72 UTF-8 bytes");
