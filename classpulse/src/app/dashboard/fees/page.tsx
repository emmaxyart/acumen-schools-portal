import Link from "next/link";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { myStudents, currentTerm } from "@/lib/scope";
import { naira } from "@/lib/grading";
import { redirect } from "next/navigation";
import { paystackEnabled } from "@/lib/paystack";
import RecordPayment from "./record-payment";
import PayOnline from "./pay-online";
import SubmitPayment from "./submit-payment";
import SubmissionsList, { type SubmissionView } from "./submissions-list";

type SubmissionRow = {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  note: string | null;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
  rejectionNote: string | null;
  createdAt: Date;
  student: { user: { name: string } };
  feeItem: { title: string };
  reviewedBy: { name: string } | null;
  paymentId: string | null;
};

function toViews(rows: SubmissionRow[]): SubmissionView[] {
  return rows.map((sub) => ({
    id: sub.id,
    amount: sub.amount,
    method: sub.method,
    reference: sub.reference,
    note: sub.note,
    status: sub.status,
    rejectionNote: sub.rejectionNote,
    createdAt: sub.createdAt.toISOString(),
    studentName: sub.student.user.name,
    feeTitle: sub.feeItem.title,
    reviewedByName: sub.reviewedBy?.name ?? null,
    paymentId: sub.paymentId,
  }));
}

const submissionInclude = {
  student: { include: { user: { select: { name: true } } } },
  feeItem: { select: { title: true } },
  reviewedBy: { select: { name: true } },
} as const;

async function balances(studentId: string, classId: string, termId: string) {
  const items = await db.feeItem.findMany({
    where: { termId, OR: [{ classId: null }, { classId }] },
    include: {
      payments: { where: { studentId } },
      intents: { where: { studentId, status: "PENDING" } },
      submissions: { where: { studentId, status: "PENDING" } },
    },
    orderBy: { title: "asc" },
  });
  return items.map((i) => {
    const paid = i.payments.reduce((a, p) => a + p.amount, 0);
    const reserved = i.intents.reduce((a, intent) => a + intent.amount, 0)
      + i.submissions.reduce((a, sub) => a + sub.amount, 0);
    const due = i.amount - paid;
    return { id: i.id, title: i.title, amount: i.amount, paid, due, available: due - reserved, reserved };
  });
}

const BANNER = {
  success: { cls: "bg-green-50 text-green-800", text: "Payment received. Thank you! Your balance is updated below." },
  pending: { cls: "bg-amber-50 text-amber-800", text: "Your payment is still being confirmed. It will appear here shortly; no need to pay again." },
  failed: { cls: "bg-red-50 text-red-800", text: "The payment didn't go through and you haven't been charged. Please try again." },
} as const;

export default async function Fees({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const s = await requireSession();
  const { payment } = await searchParams;
  const banner = BANNER[payment as keyof typeof BANNER];
  if (s.role === "TEACHER") redirect("/dashboard");
  const term = await currentTerm();
  if (!term) return <p>No term has been set up yet.</p>;

  if (s.role === "ADMIN") {
    const [students, submissions, recent] = await Promise.all([
      db.student.findMany({
        include: { user: { select: { name: true } }, class: true },
        orderBy: { user: { name: "asc" } },
      }),
      db.paymentSubmission.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: submissionInclude,
      }),
      db.payment.findMany({
        orderBy: { paidAt: "desc" },
        take: 15,
        include: { student: { include: { user: { select: { name: true } } } }, feeItem: true },
      }),
    ]);
    const rows = await Promise.all(
      students.map(async (st) => {
        const b = await balances(st.id, st.classId, term.id);
        return { st, b, billed: b.reduce((a, x) => a + x.amount, 0), paid: b.reduce((a, x) => a + x.paid, 0) };
      })
    );
    const payOptions = rows.flatMap(({ st, b }) =>
      b.filter((x) => x.available > 0).map((x) => ({
        studentId: st.id, feeItemId: x.id, label: `${st.user.name} — ${x.title} (${naira(x.available)} available)`, due: x.available,
      }))
    );
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Fees</h1>
          <p className="text-sm text-slate-500">{term.name} · {term.session}</p>
        </div>
        <RecordPayment options={payOptions} />
        <SubmissionsList items={toViews(submissions as SubmissionRow[])} isAdmin />
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[640px]">
            <thead className="border-b bg-slate-50">
              <tr>{["Student", "Class", "Billed", "Paid", "Outstanding"].map((h) => <th key={h} className="th">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {rows.map(({ st, billed, paid }) => (
                <tr key={st.id}>
                  <td className="td font-medium">{st.user.name}</td>
                  <td className="td">{st.class.name} {st.class.arm}</td>
                  <td className="td">{naira(billed)}</td>
                  <td className="td">{naira(paid)}</td>
                  <td className={`td font-semibold ${billed - paid > 0 ? "text-red-600" : "text-green-700"}`}>{naira(billed - paid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card overflow-x-auto p-0">
          <p className="border-b p-4 font-semibold">Recent payments</p>
          <table className="w-full min-w-[640px]">
            <thead className="bg-slate-50">
              <tr>{["Date", "Student", "Item", "Amount", "Method", "Reference", ""].map((h) => <th key={h} className="th">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {recent.map((p) => (
                <tr key={p.id}>
                  <td className="td">{p.paidAt.toISOString().slice(0, 10)}</td>
                  <td className="td font-medium">{p.student.user.name}</td>
                  <td className="td">{p.feeItem.title}</td>
                  <td className="td">{naira(p.amount)}</td>
                  <td className="td">{p.method === "PAYSTACK" ? "Online" : "Cash/transfer"}</td>
                  <td className="td font-mono text-xs">{p.reference}</td>
                  <td className="td"><Link href={`/dashboard/fees/receipt/${p.id}`} className="font-semibold text-brand-700 hover:underline">Receipt</Link></td>
                </tr>
              ))}
              {recent.length === 0 && <tr><td className="td text-slate-500" colSpan={7}>No payments yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const online = paystackEnabled();
  const kids = await myStudents(s);
  const [data, history, submissions] = await Promise.all([
    Promise.all(kids.map(async (k) => ({ k, b: await balances(k.id, k.classId, term.id) }))),
    db.payment.findMany({
      where: { studentId: { in: kids.map((k) => k.id) } },
      orderBy: { paidAt: "desc" },
      take: 20,
      include: { student: { include: { user: { select: { name: true } } } }, feeItem: true },
    }),
    db.paymentSubmission.findMany({
      where: { studentId: { in: kids.map((k) => k.id) } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: submissionInclude,
    }),
  ]);

  const payOptions = data.flatMap(({ k, b }) =>
    b.filter((x) => x.available > 0).map((x) => ({
      studentId: k.id, feeItemId: x.id, label: `${k.user.name} — ${x.title} (${naira(x.available)} available)`, due: x.available,
    }))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fees</h1>
        <p className="text-sm text-slate-500">{term.name} · {term.session}</p>
      </div>
      {banner && <p role="status" className={`rounded-lg p-3 text-sm ${banner.cls}`}>{banner.text}</p>}
      {!online && <p className="text-sm text-slate-500">Online payment isn&apos;t switched on for this school yet. Pay at the bursar&apos;s office and submit the details below.</p>}
      {payOptions.length > 0 && <SubmitPayment options={payOptions} />}
      <SubmissionsList items={toViews(submissions as SubmissionRow[])} isAdmin={false} />
      {data.map(({ k, b }) => (
        <div key={k.id} className="card overflow-x-auto p-0">
          <p className="border-b p-4 font-semibold">{k.user.name}</p>
          <table className="w-full min-w-[640px]">
            <thead className="bg-slate-50">
              <tr>{["Item", "Amount", "Paid", "Due", ""].map((h, i) => <th key={i} className="th">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {b.map((x) => (
                <tr key={x.id}>
                  <td className="td font-medium">{x.title}</td>
                  <td className="td">{naira(x.amount)}</td>
                  <td className="td">{naira(x.paid)}</td>
                  <td className={`td font-semibold ${x.due > 0 ? "text-red-600" : "text-green-700"}`}>
                    {naira(x.due)}
                    {x.reserved > 0 && <p className="text-xs font-normal text-amber-700">{naira(x.reserved)} awaiting confirmation</p>}
                  </td>
                  <td className="td">
                    {online && x.available > 0 && <PayOnline studentId={k.id} feeItemId={x.id} due={x.available} />}
                    {x.available <= 0 && x.reserved > 0 && <span className="text-xs text-amber-700">Awaiting confirmation</span>}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50">
                <td className="td font-bold" colSpan={3}>Total outstanding</td>
                <td className="td font-bold">{naira(b.reduce((a, x) => a + x.due, 0))}</td>
                <td className="td" />
              </tr>
            </tbody>
          </table>
        </div>
      ))}
      {history.length > 0 && (
        <div className="card overflow-x-auto p-0">
          <p className="border-b p-4 font-semibold">Payment history</p>
          <table className="w-full min-w-[640px]">
            <thead className="bg-slate-50">
              <tr>{["Date", "Student", "Item", "Amount", "Reference", ""].map((h) => <th key={h} className="th">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {history.map((p) => (
                <tr key={p.id}>
                  <td className="td">{p.paidAt.toISOString().slice(0, 10)}</td>
                  <td className="td">{p.student.user.name}</td>
                  <td className="td">{p.feeItem.title}</td>
                  <td className="td">{naira(p.amount)}</td>
                  <td className="td font-mono text-xs">{p.reference}</td>
                  <td className="td"><Link href={`/dashboard/fees/receipt/${p.id}`} className="font-semibold text-brand-700 hover:underline">Receipt</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
