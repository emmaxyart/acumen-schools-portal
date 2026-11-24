import { z } from "zod";
import { db } from "@/lib/db";
import { guard, isResponse } from "@/lib/auth";
import { canAccessSubject } from "@/lib/scope";

export async function GET(req: Request) {
  const s = await guard(["ADMIN", "TEACHER"]);
  if (isResponse(s)) return s;
  const sp = new URL(req.url).searchParams;
  const classId = sp.get("classId");
  const subjectId = sp.get("subjectId");
  const termId = sp.get("termId");
  if (!classId || !subjectId || !termId)
    return Response.json({ error: "classId, subjectId and termId required" }, { status: 400 });
  if (!(await canAccessSubject(s, classId, subjectId)))
    return Response.json({ error: "You are not assigned to this class and subject" }, { status: 403 });

  const students = await db.student.findMany({
    where: { classId },
    include: { user: { select: { name: true } }, scores: { where: { subjectId, termId } } },
    orderBy: { user: { name: "asc" } },
  });
  return Response.json(
    students.map((st) => ({
      studentId: st.id,
      name: st.user.name,
      admissionNo: st.admissionNo,
      ca1: st.scores[0]?.ca1 ?? 0,
      ca2: st.scores[0]?.ca2 ?? 0,
      exam: st.scores[0]?.exam ?? 0,
    }))
  );
}

const Body = z.object({
  classId: z.string().min(1),
  subjectId: z.string(),
  termId: z.string(),
  rows: z.array(
    z.object({
      studentId: z.string(),
      ca1: z.number().int().min(0).max(20),
      ca2: z.number().int().min(0).max(20),
      exam: z.number().int().min(0).max(60),
    })
  ),
});

export async function POST(req: Request) {
  const s = await guard(["ADMIN", "TEACHER"]);
  if (isResponse(s)) return s;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "Scores must be CA1 ≤ 20, CA2 ≤ 20, Exam ≤ 60" }, { status: 400 });
  const { classId, subjectId, termId, rows } = parsed.data;
  if (!(await canAccessSubject(s, classId, subjectId)))
    return Response.json({ error: "You are not assigned to this class and subject" }, { status: 403 });

  // A submitted row must belong to the selected class.
  const ids = [...new Set(rows.map((r) => r.studentId))];
  if (ids.length && (await db.student.count({ where: { id: { in: ids }, classId } })) !== ids.length)
    return Response.json({ error: "A student in the list is not in this class" }, { status: 400 });

  try {
    await db.$transaction(
      rows.map((r) =>
        db.score.upsert({
          where: { studentId_subjectId_termId: { studentId: r.studentId, subjectId, termId } },
          update: { ca1: r.ca1, ca2: r.ca2, exam: r.exam },
          create: { studentId: r.studentId, subjectId, termId, ca1: r.ca1, ca2: r.ca2, exam: r.exam },
        })
      )
    );
  } catch {
    return Response.json({ error: "Could not save: unknown student, subject or term" }, { status: 400 });
  }
  return Response.json({ ok: true, saved: rows.length });
}
