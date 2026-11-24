import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { COOKIE, readToken, signSession, sessionCookie, clearedCookie } from "@/lib/token";
import type { RoleName, Session } from "@/lib/token";

export { COOKIE, readToken, signSession, sessionCookie, clearedCookie };
export type { RoleName, Session };

async function verifiedUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  const session = token ? await readToken(token) : null;
  if (!session) return null;
  return db.user.findUnique({
    where: { id: session.uid },
    select: { id: true, name: true, email: true, role: true, mustChangePassword: true },
  });
}

/** Revalidates the token against the database so role changes take effect immediately. */
export async function getSession(): Promise<Session | null> {
  const user = await verifiedUser();
  return user ? { uid: user.id, role: user.role, name: user.name } : null;
}

/** The signed-in user as stored in the database right now (catches deleted users and role changes). */
export async function currentUser() {
  return verifiedUser();
}

/** For server components: a verified session or an automatic redirect to login. */
export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

/**
 * For API routes: returns the verified session, or a ready-made error Response.
 * Re-checks the database so a deleted user, a changed role or a pending forced
 * password change takes effect immediately instead of when the token expires.
 */
export async function guard(roles: RoleName[]): Promise<Session | Response> {
  const u = await currentUser();
  if (!u) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (u.mustChangePassword)
    return Response.json({ error: "Change your temporary password first" }, { status: 403 });
  if (!roles.includes(u.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  return { uid: u.id, role: u.role, name: u.name };
}

export const isResponse = (v: Session | Response): v is Response => v instanceof Response;
