import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maple Diary",
  description: "메이플 수익 기록장",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon-32.png", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#f7f0e4",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
