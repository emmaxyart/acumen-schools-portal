import { z } from "zod";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { guard, isResponse } from "@/lib/auth";
import { generateTempPassword, hashPassword } from "@/lib/password";

const Body = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("class"), name: z.string().trim().min(2).max(40), arm: z.string().trim().min(1).max(10) }),
  z.object({ kind: z.literal("subject"), name: z.string().trim().min(2).max(60), code: z.string().trim().min(2).max(10) }),
  z.object({
    kind: z.literal("term"),
    name: z.string().trim().min(3).max(40),
    session: z.string().trim().regex(/^\d{4}\/\d{4}$/, "Session looks like 2026/2027"),
    current: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal("fee"),
    title: z.string().trim().min(2).max(80),
    amount: z.number().int().positive().max(100_000_000),
    termId: z.string().min(1),
    classId: z.string().min(1).nullable().optional(),
  }),
  z.object({
    kind: z.literal("teacher"),
    name: z.string().trim().min(2).max(80),
    email: z.string().email(),
  }),
  z.object({
    kind: z.literal("parent"),
    name: z.string().trim().min(2).max(80),
    email: z.string().email(),
    phone: z.string().trim().max(20).optional(),
  }),
]);

export async function POST(req: Request) {
  const s = await guard(["ADMIN"]);
  if (isResponse(s)) return s;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Check the form fields" }, { status: 400 });
  const d = parsed.data;

  try {
    switch (d.kind) {
      case "class": {
        const row = await db.class.create({ data: { name: d.name, arm: d.arm.toUpperCase() } });
        return Response.json(row, { status: 201 });
      }
      case "subject": {
        const row = await db.subject.create({ data: { name: d.name, code: d.code.toUpperCase() } });
        return Response.json(row, { status: 201 });
      }
      case "term": {
        const row = await db.$transaction(async (tx) => {
          if (d.current) await tx.term.updateMany({ data: { current: false } });
          return tx.term.create({ data: { name: d.name, session: d.session, current: !!d.current } });
        });
        return Response.json(row, { status: 201 });
      }
      case "fee": {
        const term = await db.term.findUnique({ where: { id: d.termId }, select: { id: true } });
        if (!term) return Response.json({ error: "Term not found" }, { status: 400 });
        if (d.classId && !(await db.class.findUnique({ where: { id: d.classId }, select: { id: true } })))
          return Response.json({ error: "Class not found" }, { status: 400 });
        const row = await db.feeItem.create({
          data: { title: d.title, amount: d.amount, termId: d.termId, classId: d.classId ?? null },
        });
        return Response.json(row, { status: 201 });
      }
      case "teacher": {
        const tempPassword = generateTempPassword();
        const count = await db.teacher.count();
        const user = await db.user.create({
          data: {
            email: d.email.toLowerCase(),
            name: d.name,
            role: "TEACHER",
            passwordHash: await hashPassword(tempPassword),
            mustChangePassword: true,
            teacher: { create: { staffNo: `STF-${String(count + 1).padStart(3, "0")}-${randomBytes(2).toString("hex").toUpperCase()}` } },
          },
        });
        return Response.json({ id: user.id, tempPassword }, { status: 201 });
      }
      case "parent": {
        const tempPassword = generateTempPassword();
        const user = await db.user.create({
          data: {
            email: d.email.toLowerCase(),
            name: d.name,
            role: "PARENT",
            passwordHash: await hashPassword(tempPassword),
            mustChangePassword: true,
            parent: { create: { phone: d.phone || null } },
          },
        });
        return Response.json({ id: user.id, tempPassword }, { status: 201 });
      }
    }
  } catch (e) {
    if ((e as { code?: string }).code === "P2002")
      return Response.json({ error: "That already exists" }, { status: 409 });
    throw e;
  }
}

/** Mark an existing term as the current one. */
export async function PATCH(req: Request) {
  const s = await guard(["ADMIN"]);
  if (isResponse(s)) return s;
  const parsed = z.object({ termId: z.string().min(1) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "termId required" }, { status: 400 });
  const term = await db.term.findUnique({ where: { id: parsed.data.termId }, select: { id: true } });
  if (!term) return Response.json({ error: "Term not found" }, { status: 404 });
  await db.$transaction([
    db.term.updateMany({ data: { current: false } }),
    db.term.update({ where: { id: term.id }, data: { current: true } }),
  ]);
  return Response.json({ ok: true });
}
