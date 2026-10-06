import type { Metadata } from "next";
import { IBM_Plex_Mono, Hahmlet } from "next/font/google";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";

// 숫자·라벨용 고정폭 글꼴 — 셀프 호스팅되어 외부 요청 없이 로드됨
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

// 홈 제목용 명조 글꼴 (Hahmlet) — 한글 글리프는 unicode-range로 필요한 조각만 내려받음
const hahmlet = Hahmlet({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-hahmlet",
  display: "swap",
  preload: false,
});

// 사이트 주소 — 링크 미리보기 이미지의 절대 주소를 만들 때 사용
// (Vercel이 배포 때 넣어 주는 대표 도메인, 직접 정하려면 NEXT_PUBLIC_SITE_URL 환경변수)
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

const SITE_DESC = "통계, 공공, 연구, 금융 데이터를 한 곳에서 찾고 신청하세요. 인제대학교 데이터거버넌스센터 데이터허브.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "인제대학교 데이터거버넌스센터",
  description: SITE_DESC,
  // 카카오톡·SNS에 링크를 보낼 때 뜨는 미리보기 (public/og.png, 1200×630)
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "인제대학교 데이터거버넌스센터",
    title: "인제대학교 데이터거버넌스센터 데이터허브",
    description: SITE_DESC,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "김해를 데이터로 읽는 곳 — 인제대학교 데이터거버넌스센터" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
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
    <html lang="ko" className={`h-full ${plexMono.variable} ${hahmlet.variable}`}>
      <body className="min-h-full flex flex-col antialiased">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
