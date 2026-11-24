import { db } from "@/lib/db";
import type { Session } from "@/lib/auth";

/** Students a signed-in student/parent is allowed to view. */
export async function myStudents(s: Session) {
  if (s.role === "STUDENT") {
    return db.student.findMany({
      where: { userId: s.uid },
      include: { user: { select: { name: true } }, class: true },
    });
  }
  if (s.role === "PARENT") {
    return db.student.findMany({
      where: { parent: { userId: s.uid } },
      include: { user: { select: { name: true } }, class: true },
    });
  }
  return [];
}

export async function currentTerm() {
  return (await db.term.findFirst({ where: { current: true } })) ?? (await db.term.findFirst());
}

async function teacherId(userId: string) {
  return (await db.teacher.findUnique({ where: { userId }, select: { id: true } }))?.id ?? null;
}

/** Teacher-scoped IDs, or null when the role is unrestricted (admin). */
export async function assignedClassIds(s: Session): Promise<string[] | null> {
  if (s.role !== "TEACHER") return null;
  const tid = await teacherId(s.uid);
  if (!tid) return [];
  const rows = await db.teacherClass.findMany({ where: { teacherId: tid }, select: { classId: true } });
  return rows.map((r) => r.classId);
}

export async function assignedSubjectPairs(s: Session): Promise<{ classId: string; subjectId: string }[] | null> {
  if (s.role !== "TEACHER") return null;
  const tid = await teacherId(s.uid);
  if (!tid) return [];
  const rows = await db.teacherSubject.findMany({
    where: { teacherId: tid },
    select: { classId: true, subjectId: true },
  });
  return rows.map(({ classId, subjectId }) => ({ classId, subjectId }));
}

/** A teacher may mark attendance only for assigned classes; admins may use any class. */
export async function canAccessClass(s: Session, classId: string): Promise<boolean> {
  const ids = await assignedClassIds(s);
  return ids === null || ids.includes(classId);
}

/** A teacher may enter scores only for an assigned (class, subject) pair. */
export async function canAccessSubject(s: Session, classId: string, subjectId: string): Promise<boolean> {
  const pairs = await assignedSubjectPairs(s);
  return pairs === null || pairs.some((p) => p.classId === classId && p.subjectId === subjectId);
}
