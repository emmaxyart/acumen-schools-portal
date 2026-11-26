import { z } from "zod";
import { db } from "@/lib/db";
import { guard, isResponse } from "@/lib/auth";
import { generateTempPassword, hashPassword } from "@/lib/password";

// Admin-only edit / delete / reset-password for every record the Setup and Students pages manage.
// Deletes refuse when other data depends on the record (payments, results, enrolled students),
// because silently cascading would destroy financial and academic history.

type Ctx = { params: Promise<{ entity: string; id: string }> };

const bad = (error: string, status = 400) => Response.json({ error }, { status });
const code = (e: unknown) => (e as { code?: string } | null)?.code;
const lower = (s: string) => s.trim().toLowerCase();

const schemas = {
  students: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().email(),
    gender: z.enum(["M", "F"]),
    classId: z.string().min(1),
    guardianEmail: z.union([z.string().email(), z.literal("")]),
  }),
  classes: z.object({ name: z.string().trim().min(2).max(40), arm: z.string().trim().min(1).max(10) }),
  subjects: z.object({ name: z.string().trim().min(2).max(60), code: z.string().trim().min(2).max(10) }),
  terms: z.object({
    name: z.string().trim().min(3).max(40),
    session: z.string().trim().regex(/^\d{4}\/\d{4}$/, "Session looks like 2026/2027"),
  }),
  fees: z.object({
    title: z.string().trim().min(2).max(80),
    amount: z.number().int().positive().max(100_000_000),
    classId: z.string().min(1).nullable(),
  }),
  parents: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().email(),
    phone: z.string().trim().max(20),
  }),
  teachers: z.object({ name: z.string().trim().min(2).max(80), email: z.string().email() }),
} as const;

type Entity = keyof typeof schemas;
const isEntity = (v: string): v is Entity => Object.prototype.hasOwnProperty.call(schemas, v);

// Every field optional on edit. Built once, per entity, so TypeScript never has to call .partial() on a union.
const patchSchemas: Record<Entity, z.ZodTypeAny> = {
  students: schemas.students.partial(),
  classes: schemas.classes.partial(),
  subjects: schemas.subjects.partial(),
  terms: schemas.terms.partial(),
  fees: schemas.fees.partial(),
  parents: schemas.parents.partial(),
  teachers: schemas.teachers.partial(),
};

async function admin() {
  return guard(["ADMIN"]);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const s = await admin();
  if (isResponse(s)) return s;
  const { entity, id } = await params;
  if (!isEntity(entity)) return bad("Unknown record type", 404);

  const parsed = patchSchemas[entity].safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Check the form fields");
  const d = parsed.data as Record<string, string | number | null | undefined>;
  if (Object.values(d).every((v) => v === undefined)) return bad("Nothing to change");

  try {
    switch (entity) {
      case "students": {
        const st = await db.student.findUnique({ where: { id } });
        if (!st) return bad("Student not found", 404);
        if (d.classId && !(await db.class.findUnique({ where: { id: String(d.classId) }, select: { id: true } })))
          return bad("Class not found");
        const gender = d.gender === "M" || d.gender === "F" ? d.gender : undefined;

        let parentId: string | null | undefined;
        if (d.guardianEmail !== undefined) {
          if (d.guardianEmail === "") parentId = null;
          else {
            const p = await db.parent.findFirst({ where: { user: { email: lower(String(d.guardianEmail)) } } });
            if (!p) return bad("No parent account has that email. Create it under Setup first.");
            parentId = p.id;
          }
        }
        await db.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: st.userId },
            data: {
              ...(d.name !== undefined && { name: String(d.name) }),
              ...(d.email !== undefined && { email: lower(String(d.email)) }),
            },
          });
          await tx.student.update({
            where: { id },
            data: {
              ...(gender !== undefined && { gender }),
              ...(d.classId !== undefined && { classId: String(d.classId) }),
              ...(parentId !== undefined && { parentId }),
            },
          });
        }, { isolationLevel: "Serializable" });
        break;
      }
      case "classes": {
        await db.class.update({
          where: { id },
          data: {
            ...(d.name !== undefined && { name: String(d.name) }),
            ...(d.arm !== undefined && { arm: String(d.arm).toUpperCase() }),
          },
        });
        break;
      }
      case "subjects": {
        await db.subject.update({
          where: { id },
          data: {
            ...(d.name !== undefined && { name: String(d.name) }),
            ...(d.code !== undefined && { code: String(d.code).toUpperCase() }),
          },
        });
        break;
      }
      case "terms": {
        await db.term.update({
          where: { id },
          data: {
            ...(d.name !== undefined && { name: String(d.name) }),
            ...(d.session !== undefined && { session: String(d.session) }),
          },
        });
        break;
      }
      case "fees": {
        const result = await db.$transaction(async (tx) => {
          const fee = await tx.feeItem.findUnique({ where: { id } });
          if (!fee) return { error: "Fee item not found", status: 404 as const };

          const changesAmount = d.amount !== undefined && Number(d.amount) !== fee.amount;
          const changesClass = d.classId !== undefined && (d.classId ?? null) !== fee.classId;
          const pendingIntents = await tx.paymentIntent.count({ where: { feeItemId: id, status: "PENDING" } });
          if (pendingIntents > 0 && (changesAmount || changesClass))
            return { error: "A checkout is in progress for this item, so its amount and class can't change yet.", status: 409 as const };

          const byStudent = await tx.payment.groupBy({
            by: ["studentId"],
            where: { feeItemId: id },
            _sum: { amount: true },
          });
          const highestPaid = byStudent.reduce((m, r) => Math.max(m, r._sum.amount ?? 0), 0);
          if (d.amount !== undefined && Number(d.amount) < highestPaid)
            return {
              error: `A student has already paid ₦${highestPaid.toLocaleString("en-NG")}, so the amount can't be lower than that`,
              status: 409 as const,
            };
          if (changesClass && byStudent.length > 0)
            return { error: "Payments exist for this item, so who it applies to can't change", status: 409 as const };
          if (d.classId && !(await tx.class.findUnique({ where: { id: String(d.classId) }, select: { id: true } })))
            return { error: "Class not found", status: 400 as const };

          await tx.feeItem.update({
            where: { id },
            data: {
              ...(d.title !== undefined && { title: String(d.title) }),
              ...(d.amount !== undefined && { amount: Number(d.amount) }),
              ...(d.classId !== undefined && { classId: d.classId === null ? null : String(d.classId) }),
            },
          });
          return null;
        }, { isolationLevel: "Serializable" });
        if (result) return bad(result.error, result.status);
        break;
      }
      case "parents": {
        const p = await db.parent.findUnique({ where: { id } });
        if (!p) return bad("Parent not found", 404);
        await db.$transaction([
          db.user.update({
            where: { id: p.userId },
            data: {
              ...(d.name !== undefined && { name: String(d.name) }),
              ...(d.email !== undefined && { email: lower(String(d.email)) }),
            },
          }),
          db.parent.update({ where: { id }, data: { ...(d.phone !== undefined && { phone: String(d.phone) || null }) } }),
        ]);
        break;
      }
      case "teachers": {
        const t = await db.teacher.findUnique({ where: { id } });
        if (!t) return bad("Teacher not found", 404);
        await db.user.update({
          where: { id: t.userId },
          data: {
            ...(d.name !== undefined && { name: String(d.name) }),
            ...(d.email !== undefined && { email: lower(String(d.email)) }),
          },
        });
        break;
      }
    }
    return Response.json({ ok: true });
  } catch (e) {
    if (code(e) === "P2002") return bad("That value is already used by another record", 409);
    if (code(e) === "P2025") return bad("Record not found", 404);
    if (code(e) === "P2003") return bad("A related record changed. Refresh and try again.", 409);
    if (code(e) === "P2034") return bad("A payment or checkout changed this record. Refresh and try again.", 409);
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const s = await admin();
  if (isResponse(s)) return s;
  const { entity, id } = await params;
  if (!isEntity(entity)) return bad("Unknown record type", 404);

  try {
    switch (entity) {
      case "students": {
        const result = await db.$transaction(async (tx) => {
          const st = await tx.student.findUnique({
            where: { id },
            include: { _count: { select: { payments: true } } },
          });
          if (!st) return { error: "Student not found", status: 404 as const };
          if (st._count.payments > 0)
            return {
              error: "This student has payment records, which must be kept for your accounts. Move them to another class instead.",
              status: 409 as const,
            };
          const pending = await tx.paymentIntent.count({ where: { studentId: id, status: "PENDING" } });
          if (pending > 0)
            return {
              error: "This student has a payment checkout in progress. Wait for it to be confirmed before deleting the account.",
              status: 409 as const,
            };
          await tx.paymentIntent.deleteMany({ where: { studentId: id, status: "FAILED" } });
          await tx.user.delete({ where: { id: st.userId } });
          return null;
        }, { isolationLevel: "Serializable" });
        if (result) return bad(result.error, result.status);
        break;
      }
      case "classes": {
        const c = await db.class.findUnique({ where: { id }, include: { _count: { select: { students: true, fees: true } } } });
        if (!c) return bad("Class not found", 404);
        if (c._count.students > 0) return bad("Students are still in this class. Move or remove them first.", 409);
        if (c._count.fees > 0) return bad("Fee items are set for this class. Delete or change them first.", 409);
        await db.class.delete({ where: { id } });
        break;
      }
      case "subjects": {
        const x = await db.subject.findUnique({ where: { id }, include: { _count: { select: { scores: true } } } });
        if (!x) return bad("Subject not found", 404);
        if (x._count.scores > 0) return bad("Results have been entered for this subject, so it can't be deleted.", 409);
        await db.subject.delete({ where: { id } });
        break;
      }
      case "terms": {
        const t = await db.term.findUnique({ where: { id }, include: { _count: { select: { scores: true, fees: true } } } });
        if (!t) return bad("Term not found", 404);
        if (t._count.scores > 0 || t._count.fees > 0)
          return bad("This term already has results or fee items, so it can't be deleted.", 409);
        await db.term.delete({ where: { id } });
        break;
      }
      case "fees": {
        const result = await db.$transaction(async (tx) => {
          const paid = await tx.payment.count({ where: { feeItemId: id } });
          if (paid > 0)
            return { error: "Payments have been made against this item, so it can't be deleted.", status: 409 as const };
          const pending = await tx.paymentIntent.count({ where: { feeItemId: id, status: "PENDING" } });
          if (pending > 0)
            return { error: "A checkout is in progress for this item. Wait for it to finish before deleting the fee.", status: 409 as const };
          await tx.paymentIntent.deleteMany({ where: { feeItemId: id, status: "FAILED" } });
          await tx.feeItem.delete({ where: { id } });
          return null;
        }, { isolationLevel: "Serializable" });
        if (result) return bad(result.error, result.status);
        break;
      }
      case "parents": {
        const p = await db.parent.findUnique({ where: { id } });
        if (!p) return bad("Parent not found", 404);
        await db.user.delete({ where: { id: p.userId } }); // children are kept and become unlinked
        break;
      }
      case "teachers": {
        const t = await db.teacher.findUnique({ where: { id } });
        if (!t) return bad("Teacher not found", 404);
        await db.user.delete({ where: { id: t.userId } });
        break;
      }
    }
    return Response.json({ ok: true });
  } catch (e) {
    if (code(e) === "P2025") return bad("Record not found", 404);
    if (code(e) === "P2003")
      return bad("Other records still depend on this one (for example announcements it posted), so it can't be deleted.", 409);
    if (code(e) === "P2034") return bad("A payment or checkout changed this record. Refresh and try again.", 409);
    throw e;
  }
}

/** Issue a new one-time password (for a forgotten login). The person must change it at next sign-in. */
export async function POST(_req: Request, { params }: Ctx) {
  const s = await admin();
  if (isResponse(s)) return s;
  const { entity, id } = await params;

  let userId: string | undefined;
  if (entity === "students") userId = (await db.student.findUnique({ where: { id }, select: { userId: true } }))?.userId;
  else if (entity === "parents") userId = (await db.parent.findUnique({ where: { id }, select: { userId: true } }))?.userId;
  else if (entity === "teachers") userId = (await db.teacher.findUnique({ where: { id }, select: { userId: true } }))?.userId;
  else return bad("Unknown record type", 404);
  if (!userId) return bad("Record not found", 404);

  const tempPassword = generateTempPassword();
  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(tempPassword), mustChangePassword: true } });
  return Response.json({ ok: true, tempPassword });
}
