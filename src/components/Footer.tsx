import Link from "next/link";
import Image from "next/image";

const quickLinks = [
  { href: "/datasets",   label: "데이터 탐색" },
  { href: "/analysis",   label: "데이터 분석" },
  { href: "/policy",     label: "정책" },
  { href: "/board/free", label: "게시판" },
];

export default function Footer() {
  return (
    <footer className="bg-neutral-50 border-t border-neutral-200 text-neutral-500">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-14 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">

          {/* 브랜드 */}
          <div className="md:col-span-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 flex-shrink-0">
                <Image src="/logo.png" alt="인제대학교 데이터거버넌스센터 로고" fill sizes="40px"
                  style={{ objectFit: "contain" }} draggable={false} />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-xs text-neutral-500">인제대학교 글로컬대학</span>
                <span className="font-semibold text-neutral-900 text-sm">데이터거버넌스센터</span>
              </div>
            </div>
            <p className="text-sm leading-relaxed max-w-[40ch]">
              신뢰할 수 있는 데이터를 탐색하고, 연구와 산업에 활용하세요.
            </p>
          </div>

          {/* 바로가기 */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-neutral-900 font-medium text-sm">바로가기</h4>
            <ul className="space-y-2 text-sm">
              {quickLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-neutral-900 transition-colors duration-150">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 문의 */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-neutral-900 font-medium text-sm">문의</h4>
            <a href="mailto:han9449@inje.ac.kr"
              className="block text-sm hover:text-neutral-900 transition-colors duration-150">
              han9449@inje.ac.kr
            </a>
            <p className="text-sm leading-relaxed">
              경상남도 김해시 인제로 197<br />인제대학교 데이터거버넌스센터
            </p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-neutral-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <p>© 2026 인제대학교 데이터거버넌스센터</p>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-neutral-900 transition-colors duration-150">개인정보처리방침</Link>
            <Link href="/terms" className="hover:text-neutral-900 transition-colors duration-150">이용약관</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
