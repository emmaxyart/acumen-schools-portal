import Logo from "@/components/logo";

const chips = ["Attendance", "Results", "Fees", "Announcements"];

/**
 * Desktop-only visual panel beside the auth forms. On phones the form takes the
 * full width and the logo in the form header carries the branding instead.
 */
export default function AuthVisual() {
  return (
    <aside className="relative hidden w-1/2 shrink-0 overflow-hidden bg-slate-900 lg:flex">
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-brand-900 via-slate-900 to-slate-950" />
      <div aria-hidden="true" className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-500/25 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative flex w-full flex-col justify-between gap-8 p-10 xl:p-14">
        <div className="flex items-center gap-3">
          <Logo size={56} />
          <div>
            <p className="text-sm font-bold tracking-tight text-white">Acumen Schools Portal</p>
            <p className="text-xs text-white">Raising future Acumen leaders</p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-dashed border-white/25 bg-white/5 backdrop-blur-sm">
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="h-14 w-14 text-brand-300/70" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
              <p className="text-sm font-semibold text-white">Your school, in focus</p>
              <p className="max-w-[15rem] text-xs leading-relaxed text-slate-400">
                Add a campus photo here to give this space your school&apos;s own identity.
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="max-w-md text-2xl font-bold leading-snug tracking-tight text-white xl:text-3xl">
            Everything your school needs, in one calm place.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span key={chip} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-brand-100">
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
