import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, newPasswordSchema } from "@/lib/password";
import { hashResetToken } from "@/lib/reset-token";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const Body = z.object({
  token: z.string().regex(/^[0-9a-f]{64}$/, "Invalid reset link"),
  next: newPasswordSchema,
});

export async function POST(req: Request) {
  const limited = await rateLimit(`reset:${clientIp(req)}`, 10, 15 * 60 * 1000);
  if (!limited.ok)
    return Response.json({ error: "Too many attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(limited.retryAfter) } });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Check the form" }, { status: 400 });

  const row = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(parsed.data.token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });
  if (!row || row.usedAt || row.expiresAt <= new Date())
    return Response.json({ error: "This reset link is invalid, has expired, or was already used. Request a new one." }, { status: 400 });

  const passwordHash = await hashPassword(parsed.data.next);
  try {
    await db.$transaction(async (tx) => {
      // Atomic claim: only the first request to use this token may change the password.
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: row.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) throw new Error("Token already used");
      await tx.passwordResetToken.deleteMany({ where: { userId: row.userId, id: { not: row.id }, usedAt: null } });
      await tx.user.update({ where: { id: row.userId }, data: { passwordHash, mustChangePassword: false } });
    }, { isolationLevel: "Serializable" });
  } catch {
    return Response.json({ error: "This reset link was already used. Request a new one." }, { status: 409 });
  }
  return Response.json({ ok: true });
}
