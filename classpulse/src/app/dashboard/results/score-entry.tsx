"use client";
import { useEffect, useMemo, useState } from "react";
import { gradeFor } from "@/lib/grading";

type Opt = { id: string; label: string };
type Row = { studentId: string; name: string; admissionNo: string; ca1: number; ca2: number; exam: number };
const MAX = { ca1: 20, ca2: 20, exam: 60 } as const;

export default function ScoreEntry({
  classes,
  subjects,
  termId,
  allowedByClass,
}: {
  classes: Opt[];
  subjects: Opt[];
  termId: string;
  /** Teacher only: which subject ids are allowed for each class. Undefined = admin (all). */
  allowedByClass?: Record<string, string[]>;
}) {
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState(() => {
    const first = classes[0]?.id;
    const list = first && allowedByClass ? subjects.filter((x) => allowedByClass[first]?.includes(x.id)) : subjects;
    return list[0]?.id ?? "";
  });
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState("");

  const visibleSubjects = useMemo(
    () => (allowedByClass ? subjects.filter((x) => allowedByClass[classId]?.includes(x.id)) : subjects),
    [allowedByClass, classId, subjects]
  );

  // Keep the selected subject valid for the selected class (teachers have per-class assignments).
  useEffect(() => {
    if (!visibleSubjects.some((x) => x.id === subjectId)) setSubjectId(visibleSubjects[0]?.id ?? "");
  }, [classId, subjectId, visibleSubjects]);

  useEffect(() => {
    if (!classId || !subjectId || !visibleSubjects.some((x) => x.id === subjectId)) return;
    setMsg("");
    fetch(`/api/scores?classId=${classId}&subjectId=${subjectId}&termId=${termId}`)
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : []));
  }, [classId, subjectId, termId, visibleSubjects]);

  const edit = (id: string, key: keyof typeof MAX, raw: string) => {
    const n = Math.max(0, Math.min(MAX[key], parseInt(raw || "0", 10) || 0));
    setRows((rs) => rs.map((r) => (r.studentId === id ? { ...r, [key]: n } : r)));
  };

  async function save() {
    const res = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId,
        subjectId,
        termId,
        rows: rows.map(({ studentId, ca1, ca2, exam }) => ({ studentId, ca1, ca2, exam })),
      }),
    });
    setMsg(res.ok ? "Scores saved." : (await res.json()).error ?? "Could not save scores.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select className="input w-auto" value={classId} onChange={(e) => setClassId(e.target.value)}>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select className="input w-auto" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          {visibleSubjects.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[640px]">
          <thead className="border-b bg-slate-50">
            <tr>{["Student", "CA1 /20", "CA2 /20", "Exam /60", "Total", "Grade"].map((h) => <th key={h} className="th">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => {
              const total = r.ca1 + r.ca2 + r.exam;
              return (
                <tr key={r.studentId}>
                  <td className="td font-medium">{r.name}</td>
                  {(["ca1", "ca2", "exam"] as const).map((k) => (
                    <td key={k} className="td">
                      <input
                        className="input w-20" type="number" min={0} max={MAX[k]}
                        value={r[k]} onChange={(e) => edit(r.studentId, k, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="td font-semibold">{total}</td>
                  <td className="td font-bold">{gradeFor(total).grade}</td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td className="td text-slate-500" colSpan={6}>No students in this class.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn" onClick={save} disabled={!rows.length}>Save scores</button>
        {msg && <span className="text-sm text-slate-600">{msg}</span>}
      </div>
    </div>
  );
}
