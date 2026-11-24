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
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await connection();
  return (
    <html lang="en">
      <body><MotionProvider>{children}</MotionProvider></body>
    </html>
  );
}
