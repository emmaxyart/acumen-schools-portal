// Edge-safe: no database or next/headers imports, so middleware can use it.
import { SignJWT, jwtVerify } from "jose";

export type RoleName = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
export type Session = { uid: string; role: RoleName; name: string };

export const COOKIE = "cp_session";
export const SESSION_SECONDS = 7 * 24 * 3600;

const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set in production");
  }
  if (process.env.NODE_ENV === "production" && new TextEncoder().encode(s ?? "").length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 bytes in production");
  }
  return new TextEncoder().encode(s ?? "dev-only-secret-change-me");
};

export function signSession(s: Session) {
  return new SignJWT({ ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(secret());
}

export async function readToken(token: string): Promise<Session | null> {
  const key = secret();
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return { uid: String(payload.uid), role: payload.role as RoleName, name: String(payload.name) };
  } catch {
    return null;
  }
}

export function sessionCookie(token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}${secure}`;
}

export function clearedCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}
