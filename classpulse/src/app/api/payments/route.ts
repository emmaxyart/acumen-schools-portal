import { z } from "zod";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { guard, isResponse } from "@/lib/auth";

const Body = z.object({
  studentId: z.string(),
  feeItemId: z.string(),
  amount: z.number().int().positive(),
});

export async function POST(req: Request) {
  const s = await guard(["ADMIN"]);
  if (isResponse(s)) return s;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a valid amount" }, { status: 400 });
  const d = parsed.data;

  try {
    const result = await db.$transaction(async (tx) => {
      const fee = await tx.feeItem.findUnique({ where: { id: d.feeItemId } });
      const student = await tx.student.findUnique({ where: { id: d.studentId }, select: { classId: true } });
      if (!fee) return { error: "Fee item not found", status: 404 as const };
      if (!student) return { error: "Student not found", status: 404 as const };
      if (fee.classId && fee.classId !== student.classId)
        return { error: "That fee item doesn't apply to this student's class", status: 400 as const };

      const [paid, pending] = await Promise.all([
        tx.payment.aggregate({
          _sum: { amount: true },
          where: { studentId: d.studentId, feeItemId: d.feeItemId },
        }),
        tx.paymentIntent.aggregate({
          _sum: { amount: true },
          where: { studentId: d.studentId, feeItemId: d.feeItemId, status: "PENDING" },
        }),
      ]);
      const outstanding = fee.amount - (paid._sum.amount ?? 0) - (pending._sum.amount ?? 0);
      if (d.amount > outstanding)
        return {
          error: `Amount exceeds available balance (₦${Math.max(0, outstanding).toLocaleString("en-NG")})`,
          status: 409 as const,
        };

      const payment = await tx.payment.create({
        data: { ...d, reference: `PAY-${randomBytes(8).toString("hex").toUpperCase()}` },
      });
      return { payment };
    }, { isolationLevel: "Serializable" });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result.payment, { status: 201 });
  } catch (e) {
    if ((e as { code?: string }).code === "P2034")
      return Response.json({ error: "The balance changed while recording payment. Refresh and try again." }, { status: 409 });
    throw e;
  }
}
