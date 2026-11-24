import Link from "next/link";
import Logo from "@/components/logo";
import Gallery from "@/components/gallery";
import Icon, { type IconName } from "@/components/landing/icon";
import ParallaxPhoto from "@/components/landing/parallax-photo";
import { FadeIn, Reveal, Stagger, StaggerItem } from "@/components/motion";

const nav = [
  { href: "#platform", label: "Platform" },
  { href: "#roles", label: "For everyone" },
  { href: "#gallery", label: "Gallery" },
  { href: "#contact", label: "Contact" },
];

const features: {
  icon: IconName; title: string; description: string; span: string; visual?: boolean;
}[] = [
  {
    icon: "check", span: "md:col-span-4", visual: true,
    title: "Attendance in seconds",
    description: "Mark a whole class in one tap. Parents and students see the record the same day — no paper registers, no chasing signatures.",
  },
  {
    icon: "chart", span: "md:col-span-2",
    title: "Results that make sense",
    description: "CA1, CA2 and exam scores total automatically into grades and per-term report cards.",
  },
  {
    icon: "wallet", span: "md:col-span-2",
    title: "Fees under control",
    description: "Termly items, part-payments and live balances in naira, with secure online checkout when you're ready.",
  },
  {
    icon: "bell", span: "md:col-span-2",
    title: "One place for notices",
    description: "Post to the whole school or just teachers, parents and students. Everyone sees the right message.",
  },
  {
    icon: "settings", span: "md:col-span-2",
    title: "Set up once, run all term",
    description: "Classes, subjects, terms, fee items, teachers and parent accounts — managed from a single screen.",
  },
];

const roles: { icon: IconName; title: string; description: string; points: string[] }[] = [
  {
    icon: "shield", title: "Administrators", description: "The whole school at a glance.",
    points: ["Oversee every class and term", "Record and reconcile fees", "Manage staff and accounts"],
  },
  {
    icon: "book", title: "Teachers", description: "Less admin, more teaching.",
    points: ["Mark attendance for assigned classes", "Enter scores in a few clicks", "Post notices to any audience"],
  },
  {
    icon: "graduation", title: "Students", description: "Stay on top of their progress.",
    points: ["See results and report cards", "Track attendance history", "Pay fees online, if enabled"],
  },
  {
    icon: "users", title: "Parents", description: "Connected to their child's school.",
    points: ["Follow attendance and results", "See fee balances and history", "Get important announcements"],
  },
];

const steps = [
  { n: "01", icon: "settings" as IconName, title: "Set up your school", text: "Add classes, subjects, terms and fee items. Create teacher and parent accounts in minutes." },
  { n: "02", icon: "users" as IconName, title: "Bring in your people", text: "Enrol students, link guardians and assign teachers only the classes they handle." },
  { n: "03", icon: "bolt" as IconName, title: "Run the term, calmly", text: "Mark attendance, publish scores, track fees and keep everyone in the loop." },
];

const assurances: { icon: IconName; title: string; text: string }[] = [
  { icon: "lock", title: "Secure by default", text: "Signed sessions, role checks on every request and protected payment callbacks." },
  { icon: "mobile", title: "Works on any device", text: "A responsive interface for the school office, the classroom and the phone in your pocket." },
  { icon: "layers", title: "Built for Nigerian schools", text: "JSS/SS classes and arms, three terms a year and the familiar 20/20/60 scoring split." },
];

function SectionHeading({ eyebrow, title, subtitle, invert = false }: {
  eyebrow: string; title: string; subtitle: string; invert?: boolean;
}) {
  return (
    <Stagger className="mx-auto max-w-2xl text-center" stagger={0.12}>
      <StaggerItem><p className={`text-xs font-bold uppercase tracking-[0.2em] ${invert ? "text-brand-300" : "text-brand-600"}`}>{eyebrow}</p></StaggerItem>
      <StaggerItem><h2 className={`mt-3 text-3xl font-bold tracking-tight sm:text-4xl ${invert ? "text-white" : "text-ink"}`}>{title}</h2></StaggerItem>
      <StaggerItem><p className={`mt-4 text-sm leading-relaxed sm:text-base ${invert ? "text-slate-300" : "text-slate-600"}`}>{subtitle}</p></StaggerItem>
    </Stagger>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-ink">
      {/* ---------- Header ---------- */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <Link href="/" className="min-w-0 rounded-xl" aria-label="Acumen Schools Portal home">
            <Logo size={56} />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 lg:flex">
            {nav.map((item) => (
              <a key={item.href} href={item.href} className="transition-colors hover:text-brand-700">{item.label}</a>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/login" className="btn-ghost px-3 py-2 sm:px-4">Sign in</Link>
            <Link href="/login" className="btn hidden px-4 py-2 sm:inline-flex">Get started</Link>
          </div>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative isolate flex min-h-[85vh] items-center overflow-hidden bg-slate-950 sm:min-h-[90vh]">
        {/* Real school photo as the hero background, with layered scrims so copy stays readable. */}
        <ParallaxPhoto />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/80 via-slate-950/65 to-slate-950/95" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-950/40 via-transparent to-brand-950/25" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-52 left-1/2 h-[34rem] w-[68rem] -translate-x-1/2 rounded-full bg-brand-500/20 blur-3xl" />
        </div>
        <div className="relative mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <Stagger className="mx-auto max-w-3xl text-center" stagger={0.14} delay={0.1}>
            <StaggerItem>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-300"/>
                Raising future Acumen leaders
              </span>
            </StaggerItem>
            <StaggerItem>
              <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl">
                ACUMEN SCHOOLS PORTAL <span className="bg-gradient-to-r from-brand-300 via-emerald-200 to-white bg-clip-text text-transparent"></span>
              </h1>
            </StaggerItem>
            <StaggerItem>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-100 sm:text-lg">
                Acumen Schools Portal connects attendance, results, fees and communication for administrators, teachers, parents and students — beautifully simple, on any device.
              </p>
            </StaggerItem>
            <StaggerItem>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Link href="/login" className="btn gap-2 px-6 py-3">
                  Get started <Icon name="arrow" className="h-4 w-4" />
                </Link>
                <a href="#platform" className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20">
                  <Icon name="play" className="h-4 w-4" /> Explore the platform
                </a>
              </div>
            </StaggerItem>
            <StaggerItem>
              <p className="mt-5 text-xs font-medium text-slate-300">
                Built for Nigerian schools · JSS/SS · 3 terms · 20/20/60 grading
              </p>
            </StaggerItem>
          </Stagger>
        </div>
      </section>

      {/* ---------- Role ribbon ---------- */}
      <section className="border-y border-slate-200 bg-slate-50/70">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-5 px-4 py-8 sm:px-6 lg:flex-row lg:justify-between lg:px-8">
          <p className="text-center text-sm font-semibold text-slate-500 lg:text-left">
            One platform. Every role in your school.
          </p>
          <Stagger className="flex flex-wrap items-center justify-center gap-2 sm:gap-3" stagger={0.08}>
            {roles.map((r) => (
              <StaggerItem key={r.title}>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
                  <Icon name={r.icon} className="h-3.5 w-3.5 text-brand-600" /> {r.title}
                </span>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ---------- Gallery ---------- */}
      <div className="bg-white pt-12 sm:pt-20">
        <Gallery />
      </div>

      {/* ---------- Bento features ---------- */}
      <section id="platform" className="bg-slate-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="The platform"
            title="Everything your school runs on."
            subtitle="Purpose-built tools that replace scattered spreadsheets, paper registers and endless group chats."
          />
          <Stagger className="mt-12 grid gap-4 md:grid-cols-6" stagger={0.1}>
            {features.map((f) => (
              <StaggerItem key={f.title} hover className={f.span}>
              <article className="group relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors duration-300 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-900/5">
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                  <Icon name={f.icon} className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold tracking-tight text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.description}</p>

                {f.visual && (
                  <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900">JSS 1A · Today</p>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">36 present</span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { n: "Amaka Okafor", a: "CP/26/001", s: "Present", dot: "bg-emerald-500" },
                        { n: "Ibrahim Musa", a: "CP/26/002", s: "Late", dot: "bg-amber-500" },
                        { n: "Folake Williams", a: "CP/26/003", s: "Present", dot: "bg-emerald-500" },
                      ].map((row) => (
                        <div key={row.n} className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 shadow-sm">
                          <span className={`h-2 w-2 rounded-full ${row.dot}`} />
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{row.n}</span>
                          <span className="hidden font-mono text-[10px] text-slate-400 sm:block">{row.a}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">{row.s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ---------- For everyone ---------- */}
      <section id="roles" className="relative overflow-hidden bg-slate-900 py-20 sm:py-28">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand-900/60 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading invert
            eyebrow="Built for everyone"
            title="The right view for every role."
            subtitle="Everyone sees exactly what they need — nothing more, nothing less."
          />
          <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.1}>
            {roles.map((r) => (
              <StaggerItem key={r.title} hover>
              <article className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm transition-colors hover:border-brand-400/40 hover:bg-white/[0.07]">
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300 ring-1 ring-brand-400/20">
                  <Icon name={r.icon} className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-white">{r.title}</h3>
                <p className="mt-1 text-xs text-slate-400">{r.description}</p>
                <ul className="mt-5 space-y-2.5">
                  {r.points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-xs leading-relaxed text-slate-300">
                      <Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" /> {p}
                    </li>
                  ))}
                </ul>
              </article>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="How it works"
            title="From setup to a smoothly running term."
            subtitle="Three simple steps, then everything stays in sync."
          />
          <Stagger className="relative mt-14 grid gap-8 md:grid-cols-3 md:gap-6" stagger={0.14}>
            <div aria-hidden="true" className="absolute left-0 right-0 top-5 hidden border-t border-dashed border-brand-200 md:block" />
            {steps.map((s) => (
              <StaggerItem key={s.n} className="relative text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-brand-200 bg-white text-brand-700 shadow-sm ring-4 ring-white">
                  <Icon name={s.icon} className="h-5 w-5" />
                </div>
                <p className="mt-4 text-[11px] font-bold tracking-widest text-brand-600">STEP {s.n}</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">{s.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-600">{s.text}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ---------- Assurance ---------- */}
      <section className="bg-slate-50 py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <SectionHeading
              eyebrow="Peace of mind"
              title="Serious about your school's data."
              subtitle="Sessions are signed, roles are checked on every request, and payment records are protected from accidental deletion."
            />
            <Stagger className="mt-8 space-y-5" stagger={0.12}>
              {assurances.map((a) => (
                <StaggerItem key={a.title} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-700 shadow-sm ring-1 ring-slate-200">
                    <Icon name={a.icon} className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{a.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{a.text}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
          <Reveal className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8" delay={0.15}>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/20">
                <Icon name="shield" className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">Role-based by design</p>
                <p className="text-xs text-slate-500">Access is checked again on every request.</p>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {[
                { label: "Signed, secure sessions", icon: "lock" as IconName },
                { label: "Assignment-aware teachers", icon: "users" as IconName },
                { label: "Verified payment settlement", icon: "wallet" as IconName },
                { label: "Protected financial history", icon: "layers" as IconName },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                  <Icon name={item.icon} className="h-4 w-4 text-brand-600" />
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  <Icon name="check" className="ml-auto h-4 w-4 text-emerald-600" />
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section id="contact" className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-slate-900 py-20 text-center sm:py-24">
        <div aria-hidden="true" className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
        <div aria-hidden="true" className="absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
        <Stagger className="relative mx-auto max-w-3xl px-4 sm:px-6" stagger={0.12}>
          <StaggerItem><p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-300">Get started</p></StaggerItem>
          <StaggerItem><h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Ready to run a calmer school?</h2></StaggerItem>
          <StaggerItem>
            <p className="mt-4 text-sm text-brand-100 sm:text-base">
              Sign in to explore the portals, or contact your school administrator for an account.
            </p>
          </StaggerItem>
          <StaggerItem>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/login" className="btn gap-2 bg-white px-6 py-3 !text-brand-900 hover:bg-brand-50">
                Go to sign in <Icon name="arrow" className="h-4 w-4" />
              </Link>
              <a href="#platform" className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                See what&apos;s inside
              </a>
            </div>
          </StaggerItem>
        </Stagger>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-slate-200 bg-white">
        <Stagger className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8" stagger={0.1}>
          <StaggerItem>
            <Logo size={48} />
          </StaggerItem>
          <StaggerItem>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-900">Platform</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-500">
              <li><a href="#platform" className="hover:text-brand-700">Overview</a></li>
              <li><a href="#platform" className="hover:text-brand-700">Features</a></li>
              <li><a href="#gallery" className="hover:text-brand-700">Gallery</a></li>
              <li><a href="#roles" className="hover:text-brand-700">For everyone</a></li>
            </ul>
          </StaggerItem>
          <StaggerItem>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-900">Portals</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-500">
              {roles.map((r) => <li key={r.title}><a href="#roles" className="hover:text-brand-700">{r.title}</a></li>)}
            </ul>
          </StaggerItem>
          <StaggerItem>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-900">Get in touch</p>
            <p className="mt-4 text-sm leading-relaxed text-slate-500">
              Raising future Acumen leaders.<br />Talk to your school administrator to get started.
            </p>
            <Link href="/login" className="mt-4 inline-flex text-sm font-semibold text-brand-700 hover:underline">Sign in →</Link>
          </StaggerItem>
        </Stagger>
        <div className="border-t border-slate-100 py-5 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Acumen Schools Portal. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
