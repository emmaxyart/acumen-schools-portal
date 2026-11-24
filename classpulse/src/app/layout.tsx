import "./globals.css";
import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { MotionProvider } from "@/components/motion";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Acumen Schools Portal — School management for modern schools",
  description: "Attendance, results, fees and communication in one place for Nigerian schools.",
  keywords: [
    "Nigerian schools", "school management", "student attendance", "classroom management",
    "exam results", "report cards", "student fees", "online payments", "parent portal",
    "teacher portal", "student portal", "Admissions", "assembly", "classrooms",
  ],
  robots: {
    index: true,
    follow: true,
    "max-snippet": -1,
    "max-image-preview": "large",
    "max-video-preview": -1,
  },
  openGraph: {
    title: "Acumen Schools Portal — School management for modern schools",
    description: "Attendance, results, fees and communication in one place for Nigerian schools.",
    siteName: "Acumen Schools Portal",
    type: "website",
    locale: "en_US",
    images: [
      { url: "/school-poster.png", width: 1024, height: 1536, alt: "Acumen Schools Portal — school photo" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Acumen Schools Portal — School management for modern schools",
    description: "Attendance, results, fees and communication in one place for Nigerian schools.",
    images: [
      { url: "/school-poster.png", width: 1024, height: 1536, alt: "Acumen Schools Portal — school photo" },
    ],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await connection();
  return (
    <html lang="en">
      <body><MotionProvider>{children}</MotionProvider></body>
    </html>
  );
}
