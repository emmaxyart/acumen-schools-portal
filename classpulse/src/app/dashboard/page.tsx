import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { myStudents, currentTerm } from "@/lib/scope";
import { naira } from "@/lib/grading";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

export default async function Overview() {
  const s = await requireSession();
  const term = await currentTerm();

  let stats: [string, string | number][] = [];
  if (s.role === "ADMIN" || s.role === "TEACHER") {
    const [students, classes, teachers] = await Promise.all([
      db.student.count(),
      db.class.count(),
      db.teacher.count(),
    ]);
    stats = [["Students", students], ["Classes", classes], ["Teachers", teachers]];
    if (s.role === "ADMIN") {
      const paid = await db.payment.aggregate({ _sum: { amount: true } });
      stats.push(["Fees collected", naira(paid._sum.amount ?? 0)]);
    }
  } else {
    const kids = await myStudents(s);
    stats = [["Children / profile", kids.map((k) => k.user.name).join(", ") || "—"]];
    if (kids[0]) {
      const att = await db.attendance.groupBy({
        by: ["status"],
        where: { studentId: { in: kids.map((k) => k.id) } },
        _count: true,
      });
      const total = att.reduce((a, b) => a + b._count, 0);
      const present = att.filter((a) => a.status !== "ABSENT").reduce((a, b) => a + b._count, 0);
      stats.push(["Attendance", total ? `${Math.round((present / total) * 100)}%` : "—"]);
    }
  }

  const notices = await db.announcement.findMany({
    where: s.role === "ADMIN" ? {} : { OR: [{ audience: null }, { audience: s.role }] },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {s.name.split(" ")[0]}</h1>
        {term && <p className="text-sm text-slate-500">{term.name} · {term.session}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([l, v]) => <Stat key={l} label={l} value={v} />)}
      </div>
      <div className="card">
        <h2 className="mb-3 font-semibold">Latest announcements</h2>
        {notices.length === 0 && <p className="text-sm text-slate-500">Nothing yet.</p>}
        <ul className="space-y-3">
          {notices.map((n) => (
            <li key={n.id}>
              <p className="text-sm font-medium">{n.title}</p>
              <p className="text-sm text-slate-600">{n.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
