"use client";
import { useEffect, useState } from "react";

type Row = { studentId: string; name: string; admissionNo: string; status: "PRESENT" | "ABSENT" | "LATE" };

export default function AttendanceMarker({ classes, today }: { classes: { id: string; label: string }[]; today: string }) {
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!classId) return;
    setMsg("");
    fetch(`/api/attendance?classId=${classId}&date=${date}`)
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : []));
  }, [classId, date]);

  const set = (id: string, status: Row["status"]) =>
    setRows((rs) => rs.map((r) => (r.studentId === id ? { ...r, status } : r)));

  async function save() {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, date, rows: rows.map(({ studentId, status }) => ({ studentId, status })) }),
      });
      setMsg(res.ok ? "Attendance saved." : "Could not save attendance.");
    } catch {
      setMsg("Could not save attendance. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select className="input w-auto" value={classId} onChange={(e) => setClassId(e.target.value)}>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <input className="input w-auto" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
        <button className="btn-ghost" onClick={() => setRows((rs) => rs.map((r) => ({ ...r, status: "PRESENT" })))}>Mark all present</button>
      </div>
      <div className="card divide-y p-0">
        {rows.map((r) => (
          <div key={r.studentId} className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm font-medium">{r.name}</p>
              <p className="font-mono text-xs text-slate-500">{r.admissionNo}</p>
            </div>
            <div className="flex gap-1">
              {(["PRESENT", "LATE", "ABSENT"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => set(r.studentId, st)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold ${
                    r.status === st ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st[0] + st.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="p-4 text-sm text-slate-500">No students in this class.</p>}
      </div>
      <div className="flex items-center gap-3">
        <button className="btn" onClick={save} disabled={!rows.length || saving}>
          {saving ? "Saving…" : "Save attendance"}
        </button>
        {msg && <span role="status" className="text-sm text-slate-600">{msg}</span>}
      </div>
    </div>
  );
}
