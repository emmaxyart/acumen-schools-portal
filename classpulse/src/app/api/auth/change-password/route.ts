import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hashPassword, newPasswordSchema } from "@/lib/password";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const Body = z.object({ current: z.string().min(1).max(200), next: newPasswordSchema });

// Lives under /api/auth so it works while a forced password change is pending (guard() blocks everything else).
export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return Response.json({ error: "Not signed in" }, { status: 401 });

  const limited = await rateLimit(`pw:${s.uid}:${clientIp(req)}`, 10, 15 * 60 * 1000);
  if (!limited.ok)
    return Response.json({ error: "Too many attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(limited.retryAfter) } });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Check the form" }, { status: 400 });
  const { current, next } = parsed.data;
  if (current === next) return Response.json({ error: "Choose a password different from the current one" }, { status: 400 });

  const user = await db.user.findUnique({ where: { id: s.uid } });
  if (!user || !(await bcrypt.compare(current, user.passwordHash)))
    return Response.json({ error: "Your current password is incorrect" }, { status: 400 });

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next), mustChangePassword: false },
  });
  return Response.json({ ok: true });
}
