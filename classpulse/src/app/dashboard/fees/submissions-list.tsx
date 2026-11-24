"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { naira } from "@/lib/grading";

export type SubmissionView = {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  note: string | null;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
  rejectionNote: string | null;
  createdAt: string;
  studentName: string;
  feeTitle: string;
  reviewedByName: string | null;
  paymentId: string | null;
};

export default function SubmissionsList({ items, isAdmin }: { items: SubmissionView[]; isAdmin: boolean }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  async function review(id: string, action: "confirm" | "reject") {
    setBusyId(id);
    setError("");
    const res = await fetch(`/api/payment-submissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusyId("");
    if (res.ok) router.refresh();
    else setError(data.error ?? "Could not update this claim");
  }

  if (!items.length) return null;

  return (
    <div className="card overflow-x-auto p-0">
      <p className="border-b p-4 font-semibold">{isAdmin ? "Payment confirmations" : "My submitted payments"}</p>
      <table className="w-full min-w-[640px]">
        <thead className="bg-slate-50">
          <tr>{["Date", "Student", "Fee", "Amount", "Method", "Status", ""].map((h) => <th key={h} className="th">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y">
          {items.map((sub) => (
            <tr key={sub.id}>
              <td className="td text-slate-500">{sub.createdAt.slice(0, 10)}</td>
              <td className="td font-medium">{sub.studentName}</td>
              <td className="td">{sub.feeTitle}</td>
              <td className="td font-semibold">{naira(sub.amount)}</td>
              <td className="td text-slate-500">{sub.method.replace("_", " ")}</td>
              <td className="td">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  sub.status === "PENDING" ? "bg-amber-100 text-amber-700"
                    : sub.status === "CONFIRMED" ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                }`}>{sub.status.toLowerCase()}</span>
                {sub.rejectionNote && <p className="mt-1 text-xs text-red-600">{sub.rejectionNote}</p>}
              </td>
              <td className="td">
                {sub.status === "CONFIRMED" && sub.paymentId && (
                  <Link href={`/dashboard/fees/receipt/${sub.paymentId}`} className="font-semibold text-brand-700 hover:underline">Receipt</Link>
                )}
                {isAdmin && sub.status === "PENDING" && (
                  <div className="flex gap-2">
                    <button disabled={busyId === sub.id} onClick={() => review(sub.id, "confirm")}
                      className="font-semibold text-brand-700 hover:underline">Confirm</button>
                    <button disabled={busyId === sub.id} onClick={() => review(sub.id, "reject")}
                      className="font-semibold text-red-600 hover:underline">Reject</button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {error && <p role="alert" className="border-t p-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
