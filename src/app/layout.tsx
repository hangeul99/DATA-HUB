import type { Metadata } from "next";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";

export const metadata: Metadata = {
  title: "인제대학교 데이터거버넌스센터",
  description: "인제대학교 데이터거버넌스센터 — 신뢰할 수 있는 데이터를 탐색하고 활용하세요.",
  keywords: "인제대학교, 데이터거버넌스센터, 공공데이터, 통계, 연구데이터",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
