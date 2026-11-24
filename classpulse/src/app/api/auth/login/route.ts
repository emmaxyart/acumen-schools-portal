import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signSession, sessionCookie } from "@/lib/token";
import { DUMMY_HASH } from "@/lib/password";
import { rateLimit, clearLimit, clientIp } from "@/lib/rate-limit";

const Body = z.object({ email: z.string().email(), password: z.string().min(1).max(200) });

const WINDOW = 15 * 60 * 1000;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a valid email and password" }, { status: 400 });
  const email = parsed.data.email.toLowerCase();

  // Throttle per account (stops guessing one password list) and per IP (stops spraying many accounts).
  const emailKey = `login:email:${email}`;
  const ipKey = `login:ip:${clientIp(req)}`;
  const [byEmail, byIp] = await Promise.all([
    rateLimit(emailKey, 8, WINDOW),
    rateLimit(ipKey, 40, WINDOW),
  ]);
  if (!byEmail.ok || !byIp.ok) {
    return Response.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(Math.max(byEmail.retryAfter, byIp.retryAfter)) } }
    );
  }

  const user = await db.user.findUnique({ where: { email } });
  const ok = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return Response.json({ error: "Incorrect email or password" }, { status: 401 });

  await clearLimit(emailKey);
  const token = await signSession({ uid: user.id, role: user.role, name: user.name });
  const res = Response.json({ ok: true, role: user.role, mustChangePassword: user.mustChangePassword });
  res.headers.append("Set-Cookie", sessionCookie(token));
  return res;
}
