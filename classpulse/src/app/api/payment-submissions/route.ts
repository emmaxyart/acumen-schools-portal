import { z } from "zod";
import { db } from "@/lib/db";
import { guard, isResponse } from "@/lib/auth";
import { myStudents } from "@/lib/scope";
import { outstandingFor } from "@/lib/balance";

const Body = z.object({
  studentId: z.string().min(1),
  feeItemId: z.string().min(1),
  amount: z.number().int().positive().max(100_000_000),
  method: z.enum(["BANK_TRANSFER", "CASH", "OTHER"]),
  reference: z.string().trim().max(80).optional(),
  note: z.string().trim().max(300).optional(),
});

/** Parent/student sees their own claims; admin sees all of them. */
export async function GET() {
  const s = await guard(["ADMIN", "STUDENT", "PARENT"]);
  if (isResponse(s)) return s;

  const where = s.role === "ADMIN"
    ? {}
    : s.role === "STUDENT"
      ? { student: { userId: s.uid } }
      : { student: { parent: { userId: s.uid } } };

  const rows = await db.paymentSubmission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      student: { include: { user: { select: { name: true } }, class: true } },
      feeItem: { select: { title: true } },
      reviewedBy: { select: { name: true } },
      payment: { select: { id: true, reference: true } },
    },
  });
  return Response.json(rows);
}

/** A parent/student claims an offline payment; an admin confirms it later. */
export async function POST(req: Request) {
  const s = await guard(["STUDENT", "PARENT"]);
  if (isResponse(s)) return s;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Check the form" }, { status: 400 });
  const d = parsed.data;

  const allowed = await myStudents(s);
  if (!allowed.some((st) => st.id === d.studentId))
    return Response.json({ error: "That student isn't linked to your account" }, { status: 403 });

  try {
    const result = await db.$transaction(async (tx) => {
      const student = await tx.student.findUnique({ where: { id: d.studentId }, select: { classId: true } });
      if (!student) return { error: "Student not found", status: 404 as const };
      const balance = await outstandingFor(tx, d.studentId, d.feeItemId);
      if (!balance) return { error: "Fee item not found", status: 404 as const };
      if (balance.fee.classId && balance.fee.classId !== student.classId)
        return { error: "That fee item doesn't apply to this student's class", status: 400 as const };
      if (d.amount > balance.outstanding)
        return {
          error: `Amount exceeds the available balance (₦${Math.max(0, balance.outstanding).toLocaleString("en-NG")})`,
          status: 409 as const,
        };

      const submission = await tx.paymentSubmission.create({
        data: { ...d, submittedById: s.uid },
      });
      return { submission };
    }, { isolationLevel: "Serializable" });

    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result.submission, { status: 201 });
  } catch (e) {
    if ((e as { code?: string }).code === "P2034")
      return Response.json({ error: "The balance changed. Refresh and try again." }, { status: 409 });
    throw e;
  }
}
