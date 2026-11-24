"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Opt = { studentId: string; feeItemId: string; label: string; due: number };

export default function SubmitPayment({ options }: { options: Opt[] }) {
  const router = useRouter();
  const [idx, setIdx] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const o = options[Number(idx)];
    if (!o) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/payment-submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: o.studentId, feeItemId: o.feeItemId, amount: Number(amount), method, reference, note }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (res.ok) {
      setMsg({ ok: true, text: "Payment submitted. Your school will confirm it and issue a receipt." });
      setIdx(""); setAmount(""); setReference(""); setNote("");
      router.refresh();
    } else setMsg({ ok: false, text: data.error ?? "Could not submit payment" });
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <div>
        <p className="font-semibold">Paid at the bank or bursar&apos;s office?</p>
        <p className="text-xs text-slate-500">Submit the details here. An administrator will confirm it and issue a receipt.</p>
      </div>
      <select className="input" value={idx} onChange={(e) => { setIdx(e.target.value); setAmount(String(options[Number(e.target.value)]?.due ?? "")); }} required>
        <option value="" disabled>Select student and fee item</option>
        {options.map((o, i) => <option key={i} value={i}>{o.label}</option>)}
      </select>
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="input" type="number" min={1} placeholder="Amount paid (₦)" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="BANK_TRANSFER">Bank transfer</option>
          <option value="CASH">Cash</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="input" placeholder="Bank / teller reference (optional)" value={reference} onChange={(e) => setReference(e.target.value)} />
        <input className="input" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <button className="btn" disabled={busy || !options.length}>{busy ? "Submitting…" : "Submit for confirmation"}</button>
      {msg && <p className={`text-sm ${msg.ok ? "text-brand-700" : "text-red-600"}`}>{msg.text}</p>}
    </form>
  );
}
