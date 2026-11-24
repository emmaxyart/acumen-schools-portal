import { randomBytes } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/paystack";
import { sendPasswordResetEmail } from "@/lib/mail";
import { hashResetToken, RESET_TTL_MS } from "@/lib/reset-token";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const Body = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a valid email address" }, { status: 400 });
  const email = parsed.data.email.toLowerCase();

  // Generic response whether or not the account exists, so emails can't be enumerated.
  const limited = await rateLimit(`forgot:${email}:${clientIp(req)}`, 5, 15 * 60 * 1000);
  if (!limited.ok)
    return Response.json({ error: "Too many requests. Try again later." }, { status: 429, headers: { "Retry-After": String(limited.retryAfter) } });

  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  let devLink: string | undefined;
  if (user) {
    const token = randomBytes(32).toString("hex");
    await db.$transaction([
      // Drop used/old tokens as well as any still-pending ones, then issue one fresh token.
      db.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      db.passwordResetToken.create({
        data: { tokenHash: hashResetToken(token), userId: user.id, expiresAt: new Date(Date.now() + RESET_TTL_MS) },
      }),
    ]);
    const link = `${appUrl(req)}/reset-password?token=${token}`;
    const result = await sendPasswordResetEmail(email, link);
    if (result.devLink && process.env.NODE_ENV !== "production") devLink = result.devLink;
  }
  return Response.json({ ok: true, ...(devLink ? { devLink } : {}) });
}
