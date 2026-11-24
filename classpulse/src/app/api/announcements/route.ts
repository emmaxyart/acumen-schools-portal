import { z } from "zod";
import { db } from "@/lib/db";
import { guard, isResponse } from "@/lib/auth";

export async function GET() {
  const s = await guard(["ADMIN", "TEACHER", "STUDENT", "PARENT"]);
  if (isResponse(s)) return s;
  const items = await db.announcement.findMany({
    where: s.role === "ADMIN" ? {} : { OR: [{ audience: null }, { audience: s.role }] },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true } } },
    take: 50,
  });
  return Response.json(items);
}

const Body = z.object({
  title: z.string().min(3).max(120),
  body: z.string().min(3).max(2000),
  audience: z.enum(["ADMIN", "TEACHER", "STUDENT", "PARENT"]).nullable().optional(),
});

export async function POST(req: Request) {
  const s = await guard(["ADMIN", "TEACHER"]);
  if (isResponse(s)) return s;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Add a title and message" }, { status: 400 });
  const a = await db.announcement.create({
    data: { ...parsed.data, audience: parsed.data.audience ?? null, authorId: s.uid },
  });
  return Response.json(a, { status: 201 });
}
