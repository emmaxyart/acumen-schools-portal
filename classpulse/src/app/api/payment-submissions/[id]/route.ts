import { z } from "zod";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { guard, isResponse } from "@/lib/auth";
import { outstandingFor } from "@/lib/balance";

type Ctx = { params: Promise<{ id: string }> };

const Body = z.object({
  action: z.enum(["confirm", "reject"]),
  note: z.string().trim().max(300).optional(),
});

/** Admin reviews an offline payment claim: confirm it into a Payment, or reject it. */
export async function PATCH(req: Request, { params }: Ctx) {
  const s = await guard(["ADMIN"]);
  if (isResponse(s)) return s;
  const { id } = await params;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid action" }, { status: 400 });
  const { action, note } = parsed.data;

  const submission = await db.paymentSubmission.findUnique({ where: { id } });
  if (!submission) return Response.json({ error: "Submission not found" }, { status: 404 });
  if (submission.status !== "PENDING")
    return Response.json({ error: "This claim has already been reviewed" }, { status: 409 });

  try {
    const result = await db.$transaction(async (tx) => {
      // Re-check inside a serializable transaction so two admins can't confirm the same claim.
      const current = await tx.paymentSubmission.findUnique({ where: { id } });
      if (!current || current.status !== "PENDING") return { error: "This claim has already been reviewed", status: 409 as const };

      if (action === "reject") {
        await tx.paymentSubmission.update({
          where: { id },
          data: { status: "REJECTED", rejectionNote: note || null, reviewedById: s.uid, reviewedAt: new Date() },
        });
        return { ok: true as const };
      }

      const balance = await outstandingFor(tx, current.studentId, current.feeItemId);
      if (!balance) return { error: "Fee item no longer exists", status: 404 as const };
      // This claim is still counted as pending, so add its own amount back before checking.
      const availableBeforeClaim = balance.outstanding + current.amount;
      if (current.amount > availableBeforeClaim)
        return {
          error: `Amount exceeds the available balance (₦${Math.max(0, availableBeforeClaim).toLocaleString("en-NG")})`,
          status: 409 as const,
        };

      const payment = await tx.payment.create({
        data: {
          studentId: current.studentId,
          feeItemId: current.feeItemId,
          amount: current.amount,
          reference: `PAY-${randomBytes(8).toString("hex").toUpperCase()}`,
          method: "CASH",
        },
      });
      await tx.paymentSubmission.update({
        where: { id },
        data: {
          status: "CONFIRMED",
          reviewedById: s.uid,
          reviewedAt: new Date(),
          paymentId: payment.id,
        },
      });
      return { ok: true as const, paymentId: payment.id };
    }, { isolationLevel: "Serializable" });

    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result);
  } catch (e) {
    if ((e as { code?: string }).code === "P2034")
      return Response.json({ error: "The balance changed. Refresh and try again." }, { status: 409 });
    throw e;
  }
}
