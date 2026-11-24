import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { myStudents, currentTerm, assignedClassIds, assignedSubjectPairs } from "@/lib/scope";
import { gradeFor } from "@/lib/grading";
import ScoreEntry from "./score-entry";

export default async function Results() {
  const s = await requireSession();
  const term = await currentTerm();
  if (!term) return <p>No term has been set up yet.</p>;

  if (s.role === "ADMIN" || s.role === "TEACHER") {
    const [allClasses, allSubjects] = await Promise.all([
      db.class.findMany({ orderBy: { name: "asc" } }),
      db.subject.findMany({ orderBy: { name: "asc" } }),
    ]);
    let classes = allClasses;
    let subjects = allSubjects;
    let allowedByClass: Record<string, string[]> | undefined;
    if (s.role === "TEACHER") {
      const assigned = (await assignedClassIds(s)) ?? [];
      const pairs = (await assignedSubjectPairs(s)) ?? [];
      classes = classes.filter((c) => assigned.includes(c.id));
      allowedByClass = {};
      for (const c of classes) allowedByClass[c.id] = pairs.filter((p) => p.classId === c.id).map((p) => p.subjectId);
      const visible = new Set(Object.values(allowedByClass).flat());
      subjects = subjects.filter((x) => visible.has(x.id));
    }
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Results</h1>
          <p className="text-sm text-slate-500">{term.name} · {term.session} — CA1 /20, CA2 /20, Exam /60</p>
        </div>
        {classes.length === 0 || subjects.length === 0 ? (
          <p className="text-sm text-slate-500">You have not been assigned any classes and subjects yet. Ask an administrator to assign you.</p>
        ) : (
          <ScoreEntry
            termId={term.id}
            classes={classes.map((c) => ({ id: c.id, label: `${c.name} ${c.arm}` }))}
            subjects={subjects.map((x) => ({ id: x.id, label: x.name }))}
            allowedByClass={allowedByClass}
          />
        )}
      </div>
    );
  }

  const kids = await myStudents(s);
  const cards = await Promise.all(
    kids.map(async (k) => ({
      kid: k,
      scores: await db.score.findMany({
        where: { studentId: k.id, termId: term.id },
        include: { subject: true },
        orderBy: { subject: { name: "asc" } },
      }),
    }))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Report card</h1>
        <p className="text-sm text-slate-500">{term.name} · {term.session}</p>
      </div>
      {cards.map(({ kid, scores }) => {
        const totals = scores.map((x) => x.ca1 + x.ca2 + x.exam);
        const avg = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
        return (
          <div key={kid.id} className="card overflow-x-auto p-0">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <p className="font-semibold">{kid.user.name}</p>
                <p className="text-xs text-slate-500">{kid.class.name} {kid.class.arm} · {kid.admissionNo}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-slate-500">Average</p>
                  <p className="text-xl font-bold">{avg.toFixed(1)}%</p>
                </div>
                <a
                  href={`/api/results/report/${kid.id}?termId=${term.id}`}
                  className="btn-ghost px-3 py-2 text-xs"
                  aria-label={`Download report card for ${kid.user.name}`}
                >
                  ↓ Download PDF
                </a>
              </div>
            </div>
            <table className="w-full min-w-[640px]">
              <thead className="bg-slate-50">
                <tr>{["Subject", "CA1", "CA2", "Exam", "Total", "Grade", "Remark"].map((h) => <th key={h} className="th">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {scores.map((x) => {
                  const t = x.ca1 + x.ca2 + x.exam;
                  const g = gradeFor(t);
                  return (
                    <tr key={x.id}>
                      <td className="td font-medium">{x.subject.name}</td>
                      <td className="td">{x.ca1}</td><td className="td">{x.ca2}</td><td className="td">{x.exam}</td>
                      <td className="td font-semibold">{t}</td>
                      <td className="td font-bold">{g.grade}</td>
                      <td className="td text-slate-500">{g.remark}</td>
                    </tr>
                  );
                })}
                {scores.length === 0 && <tr><td className="td text-slate-500" colSpan={7}>No results published yet.</td></tr>}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
