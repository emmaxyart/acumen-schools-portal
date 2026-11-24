import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { naira } from "@/lib/grading";
import RowActions from "@/components/row-actions";
import SetupForms from "./setup-forms";
import TeacherAssignments from "./teacher-assignments";

export default async function Setup() {
  const s = await requireSession();
  if (s.role !== "ADMIN") redirect("/dashboard");

  const [classes, subjects, terms, fees, teachers, parents, classLinks, subjectLinks] = await Promise.all([
    db.class.findMany({ orderBy: [{ name: "asc" }, { arm: "asc" }] }),
    db.subject.findMany({ orderBy: { name: "asc" } }),
    db.term.findMany({ orderBy: [{ session: "desc" }, { name: "asc" }] }),
    db.feeItem.findMany({ include: { term: true, class: true }, orderBy: { title: "asc" } }),
    db.teacher.findMany({ include: { user: { select: { name: true, email: true } } }, orderBy: { user: { name: "asc" } } }),
    db.parent.findMany({
      include: { user: { select: { name: true, email: true } }, _count: { select: { children: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    db.teacherClass.findMany({ select: { teacherId: true, classId: true } }),
    db.teacherSubject.findMany({ select: { teacherId: true, classId: true, subjectId: true } }),
  ]);

  const assignments = {
    teachers: teachers.map((t) => ({ id: t.id, label: t.user.name, name: t.user.name, email: t.user.email, staffNo: t.staffNo })),
    classes: classes.map((c) => ({ id: c.id, label: `${c.name} ${c.arm}` })),
    subjects: subjects.map((x) => ({ id: x.id, label: x.name })),
    classLinks,
    subjectLinks,
  };

  const classOptions = classes.map((c) => ({ value: c.id, label: `${c.name} ${c.arm}` }));
  const Empty = () => <li className="text-slate-400">None yet</li>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">School setup</h1>
        <p className="text-sm text-slate-500">Classes, subjects, terms, fee items, teachers and parent accounts.</p>
      </div>

      <SetupForms
        classes={classes.map((c) => ({ id: c.id, label: `${c.name} ${c.arm}` }))}
        terms={terms.map((t) => ({ id: t.id, label: `${t.name} · ${t.session}`, current: t.current }))}
      />

      <TeacherAssignments {...assignments} />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <h2 className="mb-2 font-semibold">Classes ({classes.length})</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            {classes.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-2">
                <span>{c.name} {c.arm}</span>
                <RowActions
                  entity="classes" id={c.id} noun={`class ${c.name} ${c.arm}`}
                  fields={[{ name: "name", label: "Class name", value: c.name }, { name: "arm", label: "Arm", value: c.arm }]}
                />
              </li>
            ))}
            {classes.length === 0 && <Empty />}
          </ul>
        </div>

        <div className="card">
          <h2 className="mb-2 font-semibold">Subjects ({subjects.length})</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            {subjects.map((x) => (
              <li key={x.id} className="flex items-start justify-between gap-2">
                <span>{x.name} <span className="font-mono text-xs text-slate-400">{x.code}</span></span>
                <RowActions
                  entity="subjects" id={x.id} noun={x.name}
                  fields={[{ name: "name", label: "Subject name", value: x.name }, { name: "code", label: "Code", value: x.code }]}
                />
              </li>
            ))}
            {subjects.length === 0 && <Empty />}
          </ul>
        </div>

        <div className="card">
          <h2 className="mb-2 font-semibold">Terms ({terms.length})</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            {terms.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-2">
                <span>
                  {t.name} · {t.session}
                  {t.current && <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">current</span>}
                </span>
                <RowActions
                  entity="terms" id={t.id} noun={`${t.name} ${t.session}`}
                  fields={[
                    {
                      name: "name", label: "Term", type: "select", value: t.name,
                      options: ["First Term", "Second Term", "Third Term"].map((n) => ({ value: n, label: n })),
                    },
                    { name: "session", label: "Session (e.g. 2026/2027)", value: t.session },
                  ]}
                />
              </li>
            ))}
            {terms.length === 0 && <Empty />}
          </ul>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <p className="border-b p-4 font-semibold">Fee items</p>
        <table className="w-full min-w-[560px]">
          <thead className="bg-slate-50">
            <tr>{["Item", "Term", "Applies to", "Amount", "Actions"].map((h) => <th key={h} className="th">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {fees.map((f) => (
              <tr key={f.id}>
                <td className="td font-medium">{f.title}</td>
                <td className="td">{f.term.name} · {f.term.session}</td>
                <td className="td">{f.class ? `${f.class.name} ${f.class.arm}` : "All classes"}</td>
                <td className="td">{naira(f.amount)}</td>
                <td className="td">
                  <RowActions
                    entity="fees" id={f.id} noun={`the fee item "${f.title}"`}
                    fields={[
                      { name: "title", label: "Title", value: f.title },
                      { name: "amount", label: "Amount (₦)", type: "number", value: f.amount },
                      {
                        name: "classId", label: "Applies to", type: "select", value: f.classId ?? "", nullIfEmpty: true,
                        options: [{ value: "", label: "All classes" }, ...classOptions],
                      },
                    ]}
                  />
                </td>
              </tr>
            ))}
            {fees.length === 0 && <tr><td className="td text-slate-500" colSpan={5}>No fee items yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card overflow-x-auto p-0">
          <p className="border-b p-4 font-semibold">Teachers ({teachers.length})</p>
          <table className="w-full min-w-[560px]">
            <thead className="bg-slate-50"><tr>{["Name", "Staff no", "Actions"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {teachers.map((t) => (
                <tr key={t.id}>
                  <td className="td"><p className="font-medium">{t.user.name}</p><p className="text-xs text-slate-500">{t.user.email}</p></td>
                  <td className="td font-mono text-xs">{t.staffNo}</td>
                  <td className="td">
                    <RowActions
                      entity="teachers" id={t.id} noun={t.user.name} canResetPassword
                      fields={[
                        { name: "name", label: "Full name", value: t.user.name },
                        { name: "email", label: "Email", type: "email", value: t.user.email },
                      ]}
                    />
                  </td>
                </tr>
              ))}
              {teachers.length === 0 && <tr><td className="td text-slate-500" colSpan={3}>No teachers yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card overflow-x-auto p-0">
          <p className="border-b p-4 font-semibold">Parents ({parents.length})</p>
          <table className="w-full min-w-[560px]">
            <thead className="bg-slate-50"><tr>{["Name", "Children", "Actions"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {parents.map((p) => (
                <tr key={p.id}>
                  <td className="td"><p className="font-medium">{p.user.name}</p><p className="text-xs text-slate-500">{p.user.email}</p></td>
                  <td className="td">{p._count.children}</td>
                  <td className="td">
                    <RowActions
                      entity="parents" id={p.id} noun={p.user.name} canResetPassword
                      fields={[
                        { name: "name", label: "Full name", value: p.user.name },
                        { name: "email", label: "Email", type: "email", value: p.user.email },
                        { name: "phone", label: "Phone", value: p.phone ?? "" },
                      ]}
                    />
                  </td>
                </tr>
              ))}
              {parents.length === 0 && <tr><td className="td text-slate-500" colSpan={3}>No parents yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
