"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type Field = {
  name: string;
  label: string;
  type?: "text" | "email" | "number" | "select";
  value: string | number | null;
  options?: { value: string; label: string }[];
  /** Send null instead of "" when left blank (for optional links like a fee's class). */
  nullIfEmpty?: boolean;
};

type Props = {
  entity: "students" | "classes" | "subjects" | "terms" | "fees" | "parents" | "teachers";
  id: string;
  /** Used in prompts, e.g. "this student". */
  noun: string;
  fields: Field[];
  canResetPassword?: boolean;
};

async function call(method: string, entity: string, id: string, body?: unknown) {
  const res = await fetch(`/api/manage/${entity}/${id}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; tempPassword?: string };
  return { ok: res.ok, data };
}

export default function RowActions({ entity, id, noun, fields, canResetPassword }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const body: Record<string, string | number | null> = {};
    for (const fld of fields) {
      const raw = f[fld.name] ?? "";
      body[fld.name] = fld.type === "number" ? Number(raw) : fld.nullIfEmpty && raw === "" ? null : raw;
    }
    setBusy(true);
    setError("");
    const { ok, data } = await call("PATCH", entity, id, body);
    setBusy(false);
    if (ok) {
      setOpen(false);
      router.refresh();
    } else setError(data.error ?? "Could not save");
  }

  async function remove() {
    if (!window.confirm(`Delete ${noun}? This can't be undone.`)) return;
    setBusy(true);
    setError("");
    const { ok, data } = await call("DELETE", entity, id);
    setBusy(false);
    if (ok) router.refresh();
    else setError(data.error ?? "Could not delete");
  }

  async function reset() {
    if (!window.confirm(`Create a new temporary password for ${noun}? Their current password will stop working.`)) return;
    setBusy(true);
    setError("");
    const { ok, data } = await call("POST", entity, id);
    setBusy(false);
    if (ok) setNote(`New temporary password: ${data.tempPassword}`);
    else setError(data.error ?? "Could not reset password");
  }

  return (
    <div className="text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="font-semibold text-brand-700 hover:underline" onClick={() => { setError(""); setOpen(true); }}>
          Edit
        </button>
        {canResetPassword && (
          <button type="button" className="font-semibold text-slate-600 hover:underline" onClick={reset} disabled={busy}>
            Reset password
          </button>
        )}
        <button type="button" className="font-semibold text-red-600 hover:underline" onClick={remove} disabled={busy}>
          Delete
        </button>
      </div>
      {error && !open && <p role="alert" className="mt-1 max-w-xs text-red-600">{error}</p>}
      {note && (
        <p role="status" className="mt-1 max-w-xs rounded bg-brand-50 p-1.5 font-mono text-brand-900">
          {note}
          <button type="button" className="ml-2 font-sans underline" onClick={() => setNote("")}>dismiss</button>
        </p>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Edit ${noun}`}
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <form onSubmit={save} className="card w-full max-w-md space-y-3 text-sm">
            <h2 className="text-base font-semibold">Edit {noun}</h2>
            {fields.map((fld) => (
              <div key={fld.name}>
                <label className="mb-1 block font-medium" htmlFor={`${id}-${fld.name}`}>{fld.label}</label>
                {fld.type === "select" ? (
                  <select id={`${id}-${fld.name}`} name={fld.name} className="input" defaultValue={fld.value ?? ""}>
                    {fld.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input
                    id={`${id}-${fld.name}`}
                    name={fld.name}
                    className="input"
                    type={fld.type ?? "text"}
                    min={fld.type === "number" ? 1 : undefined}
                    defaultValue={fld.value ?? ""}
                  />
                )}
              </div>
            ))}
            {error && <p role="alert" className="text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
