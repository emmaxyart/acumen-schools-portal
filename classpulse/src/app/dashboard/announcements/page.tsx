import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import PostForm from "./post-form";

export default async function Announcements() {
  const s = await requireSession();
  const items = await db.announcement.findMany({
    where: s.role === "ADMIN" ? {} : { OR: [{ audience: null }, { audience: s.role }] },
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Announcements</h1>
      {(s.role === "ADMIN" || s.role === "TEACHER") && <PostForm />}
      <div className="space-y-3">
        {items.map((n) => (
          <article key={n.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold">{n.title}</h2>
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                {n.audience ? n.audience.toLowerCase() + "s" : "everyone"}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{n.body}</p>
            <p className="mt-3 text-xs text-slate-400">{n.author.name} · {n.createdAt.toISOString().slice(0, 10)}</p>
          </article>
        ))}
        {items.length === 0 && <p className="text-sm text-slate-500">No announcements yet.</p>}
      </div>
    </div>
  );
}
