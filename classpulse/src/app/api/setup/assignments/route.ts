import { z } from "zod";
import { db } from "@/lib/db";
import { guard, isResponse } from "@/lib/auth";

// Admin-only management of which classes / subjects each teacher may mark.
const Body = z.object({
  teacherId: z.string().min(1),
  classId: z.string().min(1),
  subjectId: z.string().min(1).optional(),
});

async function exists(model: "teacher" | "class" | "subject", id: string) {
  if (model === "teacher") return !!(await db.teacher.findUnique({ where: { id }, select: { id: true } }));
  if (model === "class") return !!(await db.class.findUnique({ where: { id }, select: { id: true } }));
  return !!(await db.subject.findUnique({ where: { id }, select: { id: true } }));
}

export async function GET() {
  const s = await guard(["ADMIN"]);
  if (isResponse(s)) return s;
  const [teachers, classes, subjects, classLinks, subjectLinks] = await Promise.all([
    db.teacher.findMany({ include: { user: { select: { name: true, email: true } } }, orderBy: { user: { name: "asc" } } }),
    db.class.findMany({ orderBy: [{ name: "asc" }, { arm: "asc" }] }),
    db.subject.findMany({ orderBy: { name: "asc" } }),
    db.teacherClass.findMany({ select: { teacherId: true, classId: true } }),
    db.teacherSubject.findMany({ select: { teacherId: true, classId: true, subjectId: true } }),
  ]);
  return Response.json({
    teachers: teachers.map((t) => ({ id: t.id, name: t.user.name, email: t.user.email, staffNo: t.staffNo })),
    classes: classes.map((c) => ({ id: c.id, label: `${c.name} ${c.arm}` })),
    subjects: subjects.map((x) => ({ id: x.id, label: x.name })),
    classLinks,
    subjectLinks,
  });
}

export async function POST(req: Request) {
  const s = await guard(["ADMIN"]);
  if (isResponse(s)) return s;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Choose a teacher and a class" }, { status: 400 });
  const { teacherId, classId, subjectId } = parsed.data;

  if (!(await exists("teacher", teacherId)) || !(await exists("class", classId)) || (subjectId && !(await exists("subject", subjectId))))
    return Response.json({ error: "Teacher, class or subject not found" }, { status: 404 });

  await db.$transaction(async (tx) => {
    await tx.teacherClass.upsert({
      where: { teacherId_classId: { teacherId, classId } },
      update: {},
      create: { teacherId, classId },
    });
    if (subjectId)
      await tx.teacherSubject.upsert({
        where: { teacherId_classId_subjectId: { teacherId, classId, subjectId } },
        update: {},
        create: { teacherId, classId, subjectId },
      });
  });
  return Response.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: Request) {
  const s = await guard(["ADMIN"]);
  if (isResponse(s)) return s;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid assignment" }, { status: 400 });
  const { teacherId, classId, subjectId } = parsed.data;

  await db.$transaction(async (tx) => {
    if (subjectId) {
      await tx.teacherSubject.deleteMany({ where: { teacherId, classId, subjectId } });
    } else {
      // Removing a class also removes its subject assignments for that teacher.
      await tx.teacherSubject.deleteMany({ where: { teacherId, classId } });
      await tx.teacherClass.deleteMany({ where: { teacherId, classId } });
    }
  });
  return Response.json({ ok: true });
}
