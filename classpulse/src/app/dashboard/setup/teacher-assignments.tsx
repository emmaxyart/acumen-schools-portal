"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Opt = { id: string; label: string };
type Teacher = Opt & { name: string; email: string; staffNo: string };
type ClassLink = { teacherId: string; classId: string };
type SubjectLink = { teacherId: string; classId: string; subjectId: string };

type Props = {
  teachers: Teacher[];
  classes: Opt[];
  subjects: Opt[];
  classLinks: ClassLink[];
  subjectLinks: SubjectLink[];
};

const labelFor = (opts: Opt[], id: string) => opts.find((o) => o.id === id)?.label ?? id;

export default function TeacherAssignments({ teachers, classes, subjects, classLinks, subjectLinks }: Props) {
  const router = useRouter();
  const [teacherId, setTeacherId] = useState(teachers[0]?.id ?? "");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(method: "POST" | "DELETE", body: object) {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/setup/assignments", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    setMsg(res.ok ? (method === "POST" ? "Assignment added." : "Assignment removed.") : data.error ?? "Could not save");
    if (res.ok) {
      setClassId("");
      setSubjectId("");
      router.refresh();
    }
  }

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="font-semibold">Teacher assignments</h2>
        <p className="text-xs text-slate-500">
          Teachers only see and mark attendance / scores for what you assign here. Admins are unrestricted.
          Assigning a subject also grants its class for attendance.
        </p>
      </div>

      <form
        className="grid gap-3 sm:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (teacherId && classId) void send("POST", { teacherId, classId, subjectId: subjectId || undefined });
        }}
      >
        <select className="input" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} required>
          <option value="" disabled>Teacher</option>
          {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)} required>
          <option value="" disabled>Class</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="">Whole class (attendance only)</option>
          {subjects.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
        <button className="btn" disabled={busy || !teacherId || !classId}>Assign</button>
      </form>

      <div>
        <p className="mb-2 text-sm font-semibold">Current assignments</p>
        {teachers.length === 0 && <p className="text-sm text-slate-500">Create a teacher account first.</p>}
        {teachers.map((t) => {
          const links = classLinks.filter((l) => l.teacherId === t.id);
          return (
            <div key={t.id} className="mb-3 rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-medium">{t.name} <span className="font-mono text-xs text-slate-400">{t.staffNo}</span></p>
              {links.length === 0 && <p className="mt-1 text-xs text-slate-400">No assignments</p>}
              {links.map((l) => {
                const subs = subjectLinks.filter((x) => x.teacherId === t.id && x.classId === l.classId);
                return (
                  <div key={l.classId} className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded bg-brand-100 px-2 py-1 font-semibold text-brand-700">
                      {labelFor(classes, l.classId)}
                    </span>
                    {subs.map((x) => (
                      <span key={x.subjectId} className="rounded bg-slate-100 px-2 py-1 text-slate-700">
                        {labelFor(subjects, x.subjectId)}
                        <button
                          type="button" disabled={busy} className="ml-1 text-red-600 hover:underline"
                          onClick={() => void send("DELETE", { teacherId: t.id, classId: l.classId, subjectId: x.subjectId })}
                          aria-label={`Remove ${labelFor(subjects, x.subjectId)}`}
                        >×</button>
                      </span>
                    ))}
                    <button
                      type="button" disabled={busy} className="text-red-600 hover:underline"
                      onClick={() => void send("DELETE", { teacherId: t.id, classId: l.classId })}
                    >Remove class</button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      {msg && <p role="status" className="text-sm text-brand-700">{msg}</p>}
    </div>
  );
}
