import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";

// 숫자·라벨용 고정폭 글꼴 — 셀프 호스팅되어 외부 요청 없이 로드됨
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "인제대학교 데이터거버넌스센터",
  description: "인제대학교 데이터거버넌스센터 — 신뢰할 수 있는 데이터를 탐색하고 활용하세요.",
  keywords: "인제대학교, 데이터거버넌스센터, 공공데이터, 통계, 연구데이터",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`h-full ${plexMono.variable}`}>
      <body className="min-h-full flex flex-col antialiased">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
