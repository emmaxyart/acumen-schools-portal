import { z } from "zod";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { guard, isResponse } from "@/lib/auth";
import { appUrl, initializeTransaction, paystackEnabled } from "@/lib/paystack";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({
  studentId: z.string().min(1),
  feeItemId: z.string().min(1),
  amount: z.number().int().positive().max(100_000_000),
});

export async function POST(req: Request) {
  const s = await guard(["PARENT", "STUDENT"]);
  if (isResponse(s)) return s;
  if (!paystackEnabled()) return Response.json({ error: "Online payment isn't available yet" }, { status: 503 });

  const limited = await rateLimit(`pay:${s.uid}`, 10, 10 * 60 * 1000);
  if (!limited.ok)
    return Response.json({ error: "Too many payment attempts. Try again shortly." }, { status: 429, headers: { "Retry-After": String(limited.retryAfter) } });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a valid amount" }, { status: 400 });
  const d = parsed.data;
  const user = await db.user.findUnique({ where: { id: s.uid }, select: { email: true } });
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  const reference = `CP-${randomBytes(8).toString("hex")}`;

  let reservation;
  try {
    reservation = await db.$transaction(async (tx) => {
      const student = await tx.student.findFirst({
        where: {
          id: d.studentId,
          ...(s.role === "STUDENT" ? { userId: s.uid } : { parent: { userId: s.uid } }),
        },
        select: { id: true, classId: true, admissionNo: true },
      });
      if (!student) return { error: "Student not found", status: 404 as const };

      const fee = await tx.feeItem.findUnique({ where: { id: d.feeItemId } });
      if (!fee || (fee.classId && fee.classId !== student.classId))
        return { error: "Fee item not found", status: 404 as const };

      const [paid, pending] = await Promise.all([
        tx.payment.aggregate({
          _sum: { amount: true },
          where: { studentId: student.id, feeItemId: fee.id },
        }),
        tx.paymentIntent.aggregate({
          _sum: { amount: true },
          where: { studentId: student.id, feeItemId: fee.id, status: "PENDING" },
        }),
      ]);
      const outstanding = fee.amount - (paid._sum.amount ?? 0) - (pending._sum.amount ?? 0);
      if (outstanding <= 0)
        return { error: "This fee is already paid or reserved by a pending checkout", status: 400 as const };
      if (d.amount > outstanding)
        return {
          error: `Amount is more than the available balance (₦${outstanding.toLocaleString("en-NG")})`,
          status: 400 as const,
        };

      const intent = await tx.paymentIntent.create({
        data: { reference, studentId: student.id, feeItemId: fee.id, amount: d.amount, payerId: s.uid },
      });
      return { intent, student, fee };
    }, { isolationLevel: "Serializable" });
  } catch (e) {
    if ((e as { code?: string }).code === "P2034")
      return Response.json({ error: "The balance changed while starting checkout. Refresh and try again." }, { status: 409 });
    throw e;
  }
  if ("error" in reservation)
    return Response.json({ error: reservation.error }, { status: reservation.status });

  try {
    const tx = await initializeTransaction({
      email: user.email,
      amountNaira: d.amount,
      reference,
      callbackUrl: `${appUrl(req)}/api/paystack/callback`,
      metadata: {
        studentId: reservation.student.id,
        feeItemId: reservation.fee.id,
        admissionNo: reservation.student.admissionNo,
        feeTitle: reservation.fee.title,
      },
    });
    return Response.json({ authorizationUrl: tx.authorization_url, reference });
  } catch (e) {
    console.error("[paystack] initialize failed", e);
    await db.paymentIntent.update({ where: { id: reservation.intent.id }, data: { status: "FAILED" } });
    return Response.json({ error: "Could not start the payment. Please try again." }, { status: 502 });
  }
}
