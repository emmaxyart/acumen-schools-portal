import Image from "next/image";
import { Stagger, StaggerItem } from "@/components/motion";

type Shot = {
  label: string;
  caption: string;
  /** Drop photos in public/gallery/ and set this to e.g. "/gallery/campus.jpg". */
  src?: string;
};

const shots: Shot[] = [
  { label: "Our campus", caption: "A welcoming place to learn" },
  { label: "Classroom", caption: "Small, focused classes" },
  { label: "Assembly", caption: "Starting the day together" },
  { label: "Library", caption: "Curiosity on every shelf" },
  { label: "Sports", caption: "Energy and teamwork" },
  { label: "Graduation", caption: "Celebrating every milestone" },
];

function Placeholder({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-brand-50 via-white to-slate-100 p-4 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        className="text-brand-500" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </svg>
      <span className="text-xs font-semibold text-slate-500">{label}</span>
    </div>
  );
}

/** Responsive photo gallery. Each tile shows a placeholder until a real `src` is supplied. */
export default function Gallery() {
  return (
    <section id="gallery" className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 sm:pb-20">
      <Stagger className="mb-6 text-center sm:mb-8" stagger={0.12}>
        <StaggerItem><p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Gallery</p></StaggerItem>
        <StaggerItem><h2 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">A glimpse of school life</h2></StaggerItem>
        <StaggerItem>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600 sm:text-base">
            The moments, spaces and people that make our school community.
          </p>
        </StaggerItem>
      </Stagger>
      <Stagger className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3" stagger={0.09}>
        {shots.map((shot) => (
          <StaggerItem key={shot.label} zoom hover>
          <figure className="group overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm transition hover:shadow-md">
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-brand-50">
              {shot.src ? (
                <Image
                  src={shot.src}
                  alt={shot.label}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover transition duration-300 group-hover:scale-105"
                />
              ) : (
                <Placeholder label={shot.label} />
              )}
            </div>
            <figcaption className="px-3 py-2.5 sm:px-4 sm:py-3">
              <p className="text-sm font-semibold text-ink">{shot.label}</p>
              <p className="text-xs text-slate-500">{shot.caption}</p>
            </figcaption>
          </figure>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
