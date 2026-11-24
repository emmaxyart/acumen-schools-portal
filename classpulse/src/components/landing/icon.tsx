import type { ReactNode } from "react";

export type IconName =
  | "arrow" | "check" | "shield" | "chart" | "users" | "wallet"
  | "bell" | "settings" | "clock" | "book" | "calendar" | "lock"
  | "sparkles" | "layers" | "mobile" | "graduation" | "bolt" | "play";

function Svg({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? "h-5 w-5"}
      aria-hidden="true">
      {children}
    </svg>
  );
}

export default function Icon({ name, className }: { name: IconName; className?: string }) {
  switch (name) {
    case "arrow": return <Svg className={className}><path d="M5 12h14m-6-6 6 6-6 6" /></Svg>;
    case "check": return <Svg className={className}><path d="m4 12 5 5L20 6" /></Svg>;
    case "shield": return <Svg className={className}><path d="M12 3 4 6v5c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></Svg>;
    case "chart": return <Svg className={className}><path d="M4 20V10m5 10V4m5 16v-7m5 7V8" /></Svg>;
    case "users": return <Svg className={className}><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0m2-15a3 3 0 0 1 0 6m1 9a5 5 0 0 0-3-4.6" /></Svg>;
    case "wallet": return <Svg className={className}><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18M16 15h2" /><path d="M6 6V4h12" /></Svg>;
    case "bell": return <Svg className={className}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></Svg>;
    case "settings": return <Svg className={className}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21h-4v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3v-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1H21v4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></Svg>;
    case "clock": return <Svg className={className}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>;
    case "book": return <Svg className={className}><path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2V5Z" /><path d="M8 7h6M8 11h6" /></Svg>;
    case "calendar": return <Svg className={className}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4m8-4v4M3 10h18" /></Svg>;
    case "lock": return <Svg className={className}><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></Svg>;
    case "sparkles": return <Svg className={className}><path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Zm7 12 .7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7L19 15Z" /></Svg>;
    case "layers": return <Svg className={className}><path d="m12 3 9 5-9 5-9-5 9-5Zm9 9-9 5-9-5m18 4-9 5-9-5" /></Svg>;
    case "mobile": return <Svg className={className}><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></Svg>;
    case "graduation": return <Svg className={className}><path d="m2 9 10-5 10 5-10 5L2 9Z" /><path d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5m4-1v6" /></Svg>;
    case "bolt": return <Svg className={className}><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" /></Svg>;
    case "play": return <Svg className={className}><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4V8Z" /></Svg>;
  }
}
