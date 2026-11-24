import { z } from "zod";
import { db } from "@/lib/db";
import { guard, isResponse } from "@/lib/auth";
import { generateTempPassword, hashPassword } from "@/lib/password";

export async function GET(req: Request) {
  const s = await guard(["ADMIN", "TEACHER"]);
  if (isResponse(s)) return s;
  const classId = new URL(req.url).searchParams.get("classId") ?? undefined;
  const students = await db.student.findMany({
    where: { classId },
    include: { user: { select: { name: true, email: true } }, class: true },
    orderBy: { user: { name: "asc" } },
  });
  return Response.json(students);
}

const Body = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  gender: z.enum(["M", "F"]),
  classId: z.string().min(1),
  guardianEmail: z.string().email().optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const s = await guard(["ADMIN"]);
  if (isResponse(s)) return s;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Check the form fields" }, { status: 400 });
  const d = parsed.data;

  if (await db.user.findUnique({ where: { email: d.email.toLowerCase() } }))
    return Response.json({ error: "That email is already in use" }, { status: 409 });

  let parentId: string | null = null;
  if (d.guardianEmail) {
    const p = await db.parent.findFirst({ where: { user: { email: d.guardianEmail.toLowerCase() } } });
    if (!p) return Response.json({ error: "Parent account not found. Create it under Setup first." }, { status: 400 });
    parentId = p.id;
  }

  if (!(await db.class.findUnique({ where: { id: d.classId }, select: { id: true } })))
    return Response.json({ error: "Class not found" }, { status: 400 });

  const year = new Date().getFullYear().toString().slice(2);
  const prefix = `CP/${year}/`;
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  // Next number = highest existing + 1 (a row count would repeat numbers after any deletion).
  // Retry if two admins create a student at the same instant and collide on the unique index.
  for (let attempt = 0; attempt < 3; attempt++) {
    const last = await db.student.findFirst({
      where: { admissionNo: { startsWith: prefix } },
      orderBy: { admissionNo: "desc" },
      select: { admissionNo: true },
    });
    const next = last ? parseInt(last.admissionNo.slice(prefix.length), 10) + 1 : 1;
    const admissionNo = `${prefix}${String(next).padStart(3, "0")}`;
    try {
      const user = await db.user.create({
        data: {
          email: d.email.toLowerCase(),
          name: d.name,
          role: "STUDENT",
          passwordHash,
          mustChangePassword: true,
          student: { create: { admissionNo, gender: d.gender, classId: d.classId, parentId } },
        },
        include: { student: true },
      });
      return Response.json({ id: user.student!.id, admissionNo, tempPassword }, { status: 201 });
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code !== "P2002") throw e;
      if (await db.user.findUnique({ where: { email: d.email.toLowerCase() } }))
        return Response.json({ error: "That email is already in use" }, { status: 409 });
    }
  }
  return Response.json({ error: "Could not allocate an admission number, please try again" }, { status: 409 });
}
