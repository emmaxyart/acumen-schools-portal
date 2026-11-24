import { z } from "zod";
import { db } from "@/lib/db";
import { guard, isResponse } from "@/lib/auth";
import { canAccessClass } from "@/lib/scope";
import { dayOf, isValidDay, todayStr } from "@/lib/grading";

export async function GET(req: Request) {
  const s = await guard(["ADMIN", "TEACHER"]);
  if (isResponse(s)) return s;
  const sp = new URL(req.url).searchParams;
  const classId = sp.get("classId");
  const date = sp.get("date");
  if (!classId || !date || !isValidDay(date))
    return Response.json({ error: "classId and a valid date (YYYY-MM-DD) required" }, { status: 400 });
  if (!(await canAccessClass(s, classId)))
    return Response.json({ error: "You are not assigned to this class" }, { status: 403 });

  const students = await db.student.findMany({
    where: { classId },
    include: { user: { select: { name: true } }, attendance: { where: { date: dayOf(date) } } },
    orderBy: { user: { name: "asc" } },
  });
  return Response.json(
    students.map((st) => ({
      studentId: st.id,
      name: st.user.name,
      admissionNo: st.admissionNo,
      status: st.attendance[0]?.status ?? "PRESENT",
    }))
  );
}

const Body = z.object({
  classId: z.string().min(1),
  date: z.string().refine(isValidDay, "Invalid date"),
  rows: z.array(z.object({ studentId: z.string(), status: z.enum(["PRESENT", "ABSENT", "LATE"]) })),
});

export async function POST(req: Request) {
  const s = await guard(["ADMIN", "TEACHER"]);
  if (isResponse(s)) return s;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid attendance data" }, { status: 400 });
  const { classId, date: day, rows } = parsed.data;
  if (!(await canAccessClass(s, classId)))
    return Response.json({ error: "You are not assigned to this class" }, { status: 403 });
  if (day > todayStr())
    return Response.json({ error: "Attendance can't be recorded for a future date" }, { status: 400 });
  const date = dayOf(day);

  // Never let a submitted row write attendance for a student outside the selected class.
  const ids = [...new Set(rows.map((r) => r.studentId))];
  if (ids.length && (await db.student.count({ where: { id: { in: ids }, classId } })) !== ids.length)
    return Response.json({ error: "A student in the list is not in this class" }, { status: 400 });

  try {
    await db.$transaction(
      rows.map((r) =>
        db.attendance.upsert({
          where: { studentId_date: { studentId: r.studentId, date } },
          update: { status: r.status },
          create: { studentId: r.studentId, date, status: r.status },
        })
      )
    );
  } catch {
    return Response.json({ error: "Could not save: unknown student in the list" }, { status: 400 });
  }
  return Response.json({ ok: true, saved: rows.length });
}
