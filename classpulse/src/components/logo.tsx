import Image from "next/image";

// Static classes so Tailwind can see them at build time. Using `fill` inside a
// relatively-positioned wrapper avoids next/image's width/height size warning.
const sizeClasses: Record<number, string> = {
  40: "h-10 w-10",
  48: "h-12 w-12",
  56: "h-14 w-14",
  64: "h-16 w-16",
  72: "h-[72px] w-[72px]",
  80: "h-20 w-20",
};

/** The Acumen Schools Portal roundel. */
export default function Logo({ size = 40, className = "" }: { size?: number; className?: string }) {
  const box = sizeClasses[size] ?? "h-16 w-16";
  return (
    <span className={`relative inline-block shrink-0 overflow-hidden rounded-full ${box} ${className}`}>
      <Image
        src="/logo.png"
        alt="Acumen Schools Portal logo"
        fill
        priority
        sizes={`${size}px`}
        className="object-cover"
      />
    </span>
  );
}
