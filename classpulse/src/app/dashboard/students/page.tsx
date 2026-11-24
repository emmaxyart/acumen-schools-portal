import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import RowActions from "@/components/row-actions";
import AddStudentForm from "./add-student-form";

export default async function Students() {
  const s = await requireSession();
  if (s.role !== "ADMIN" && s.role !== "TEACHER") redirect("/dashboard");
  const isAdmin = s.role === "ADMIN";

  const [students, classes] = await Promise.all([
    db.student.findMany({
      include: {
        user: { select: { name: true, email: true } },
        class: true,
        parent: { include: { user: { select: { email: true } } } },
      },
      orderBy: [{ class: { name: "asc" } }, { user: { name: "asc" } }],
    }),
    db.class.findMany({ orderBy: [{ name: "asc" }, { arm: "asc" }] }),
  ]);
  const classOptions = classes.map((c) => ({ value: c.id, label: `${c.name} ${c.arm}` }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Students</h1>
      {isAdmin && <AddStudentForm classes={classes.map((c) => ({ id: c.id, label: `${c.name} ${c.arm}` }))} />}
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[640px]">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="th">Adm. No</th><th className="th">Name</th><th className="th">Class</th>
              <th className="th">Email</th><th className="th">Parent</th>
              {isAdmin && <th className="th">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {students.map((st) => (
              <tr key={st.id}>
                <td className="td font-mono text-xs">{st.admissionNo}</td>
                <td className="td font-medium">{st.user.name}</td>
                <td className="td">{st.class.name} {st.class.arm}</td>
                <td className="td text-slate-500">{st.user.email}</td>
                <td className="td text-slate-500">{st.parent?.user.email ?? "—"}</td>
                {isAdmin && (
                  <td className="td">
                    <RowActions
                      entity="students"
                      id={st.id}
                      noun={`${st.user.name}`}
                      canResetPassword
                      fields={[
                        { name: "name", label: "Full name", value: st.user.name },
                        { name: "email", label: "Email", type: "email", value: st.user.email },
                        {
                          name: "gender", label: "Gender", type: "select", value: st.gender,
                          options: [{ value: "M", label: "Male" }, { value: "F", label: "Female" }],
                        },
                        { name: "classId", label: "Class", type: "select", value: st.classId, options: classOptions },
                        {
                          name: "guardianEmail",
                          label: "Parent's email (blank to unlink)",
                          type: "email",
                          value: st.parent?.user.email ?? "",
                        },
                      ]}
                    />
                  </td>
                )}
              </tr>
            ))}
            {students.length === 0 && <tr><td className="td text-slate-500" colSpan={6}>No students yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
