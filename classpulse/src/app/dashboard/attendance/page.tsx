import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { myStudents, assignedClassIds } from "@/lib/scope";
import { todayStr } from "@/lib/grading";
import AttendanceMarker from "./marker";

export default async function Attendance() {
  const s = await requireSession();

  if (s.role === "ADMIN" || s.role === "TEACHER") {
    const classes = await db.class.findMany({ orderBy: { name: "asc" } });
    const assigned = await assignedClassIds(s);
    const allowed = assigned === null ? classes : classes.filter((c) => assigned.includes(c.id));
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Attendance</h1>
        {allowed.length === 0 ? (
          <p className="text-sm text-slate-500">You have not been assigned to any classes yet. Ask an administrator to assign you.</p>
        ) : (
          <AttendanceMarker classes={allowed.map((c) => ({ id: c.id, label: `${c.name} ${c.arm}` }))} today={todayStr()} />
        )}
      </div>
    );
  }

  const kids = await myStudents(s);
  const records = await db.attendance.findMany({
    where: { studentId: { in: kids.map((k) => k.id) } },
    include: { student: { include: { user: { select: { name: true } } } } },
    orderBy: { date: "desc" },
    take: 30,
  });
  const badge = { PRESENT: "bg-green-100 text-green-700", LATE: "bg-amber-100 text-amber-700", ABSENT: "bg-red-100 text-red-700" };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Attendance</h1>
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[420px]">
          <thead className="border-b bg-slate-50"><tr><th className="th">Date</th><th className="th">Student</th><th className="th">Status</th></tr></thead>
          <tbody className="divide-y">
            {records.map((r) => (
              <tr key={r.id}>
                <td className="td">{r.date.toISOString().slice(0, 10)}</td>
                <td className="td">{r.student.user.name}</td>
                <td className="td"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge[r.status]}`}>{r.status}</span></td>
              </tr>
            ))}
            {records.length === 0 && <tr><td className="td text-slate-500" colSpan={3}>No attendance recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
