import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { naira } from "@/lib/grading";
import Logo from "@/components/logo";
import PrintButton from "../print-button";

export default async function Receipt({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession();
  const { id } = await params;

  const payment = await db.payment.findUnique({
    where: { id },
    include: {
      student: { include: { user: { select: { name: true } }, class: true } },
      feeItem: { include: { term: true } },
    },
  });
  if (!payment) notFound();

  // Admins can view any receipt; families only their own child's.
  if (s.role !== "ADMIN") {
    const own = await db.student.findFirst({
      where: {
        id: payment.studentId,
        ...(s.role === "STUDENT" ? { userId: s.uid } : { parent: { userId: s.uid } }),
      },
      select: { id: true },
    });
    if (!own) notFound();
  }

  const date = payment.paidAt.toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="mx-auto max-w-2xl">
      <div className="no-print mb-5 flex items-center justify-between gap-3">
        <Link href="/dashboard/fees" className="text-sm font-semibold text-brand-700 hover:underline">← Back to fees</Link>
        <PrintButton />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-900/5 sm:p-12">
        <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
          <Logo size={64} />
          <div>
            <p className="text-xl font-bold tracking-tight text-brand-900">Acumen Schools Portal</p>
            <p className="text-xs text-slate-500">Raising future Acumen leaders</p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Official receipt</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{naira(payment.amount)}</h1>
        </div>

        <dl className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {[
            ["Receipt number", payment.reference],
            ["Date paid", date],
            ["Student", payment.student.user.name],
            ["Admission number", payment.student.admissionNo],
            ["Class", `${payment.student.class.name} ${payment.student.class.arm}`],
            ["Fee item", payment.feeItem.title],
            ["Term", `${payment.feeItem.term.name} · ${payment.feeItem.term.session}`],
            ["Payment method", payment.method === "PAYSTACK" ? "Online (Paystack)" : "Cash / Bank transfer"],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-8 rounded-lg bg-brand-50 p-3 text-center text-sm font-medium text-brand-800">
          This is to acknowledge receipt of the amount stated above.
        </p>

        <div className="mt-14 grid grid-cols-2 gap-8">
          <div className="border-t border-slate-300 pt-2 text-xs text-slate-500">Received by (Bursar)</div>
          <div className="border-t border-slate-300 pt-2 text-xs text-slate-500">Parent / Student signature</div>
        </div>
      </div>
    </div>
  );
}
