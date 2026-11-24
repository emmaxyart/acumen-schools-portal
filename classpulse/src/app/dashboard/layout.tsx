import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, type RoleName } from "@/lib/auth";
import LogoutButton from "./logout-button";
import Logo from "@/components/logo";

const NAV: { href: string; label: string; roles: RoleName[] }[] = [
  { href: "/dashboard", label: "Overview", roles: ["ADMIN", "TEACHER", "STUDENT", "PARENT"] },
  { href: "/dashboard/students", label: "Students", roles: ["ADMIN", "TEACHER"] },
  { href: "/dashboard/attendance", label: "Attendance", roles: ["ADMIN", "TEACHER", "STUDENT", "PARENT"] },
  { href: "/dashboard/results", label: "Results", roles: ["ADMIN", "TEACHER", "STUDENT", "PARENT"] },
  { href: "/dashboard/fees", label: "Fees", roles: ["ADMIN", "STUDENT", "PARENT"] },
  { href: "/dashboard/announcements", label: "Announcements", roles: ["ADMIN", "TEACHER", "STUDENT", "PARENT"] },
  { href: "/dashboard/setup", label: "Setup", roles: ["ADMIN"] },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const s = await currentUser();
  // Cookie still valid but the account was deleted: send to login, which clears the stale cookie.
  if (!s) redirect("/login?expired=1");
  if (s.mustChangePassword) redirect("/change-password");

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 flex-col bg-brand-900 p-4 text-brand-100 md:flex lg:w-60 lg:p-5">
        <Link href="/dashboard" className="mb-8 flex items-center" aria-label="Acumen Schools Portal home">
          <Logo size={72} className="ring-2 ring-white/20" />
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.filter((n) => n.roles.includes(s.role)).map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/10">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 pt-4 text-sm">
          <p className="font-semibold text-white">{s.name}</p>
          <p className="mb-3 text-xs capitalize">{s.role.toLowerCase()}</p>
          <LogoutButton />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <nav className="flex gap-2 overflow-x-auto bg-brand-900 p-2 text-sm text-white sm:p-3 md:hidden">
          {NAV.filter((n) => n.roles.includes(s.role)).map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap rounded px-3 py-1 hover:bg-white/10">{n.label}</Link>
          ))}
          <LogoutButton />
        </nav>
        <div className="mx-auto max-w-5xl p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
