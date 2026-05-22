import Link from "next/link";
import Image from "next/image";
import { Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-neutral-900 text-neutral-400">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14 flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt="인제대학교 데이터거버넌스센터 로고"
                  fill
                  sizes="56px"
                  style={{ objectFit: "contain" }}
                  draggable={false}
                />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] text-neutral-500">인제대학교 글로컬대학</span>
                <span className="font-bold text-white text-sm">데이터거버넌스센터</span>
              </div>
            </div>
            <p className="text-sm leading-relaxed">
              신뢰할 수 있는 데이터를 탐색하고,
              <br />연구·산업에 활용하세요.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <h4 className="text-white font-semibold text-sm">바로가기</h4>
            <ul className="space-y-2 text-sm">
              {[
                { href: "/datasets", label: "데이터 탐색" },
                { href: "/analysis", label: "데이터 분석" },
                { href: "/login", label: "로그인" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-brand-400 transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="text-white font-semibold text-sm">문의</h4>
            <a
              href="mailto:han9449@inje.ac.kr"
              className="flex items-center gap-2 text-sm hover:text-brand-400 transition-colors"
            >
              <Mail size={14} />
              han9449@inje.ac.kr
            </a>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p>© 2026 인제대학교 데이터거버넌스센터. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-brand-400 transition-colors">개인정보처리방침</Link>
            <Link href="/terms" className="hover:text-brand-400 transition-colors">이용약관</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
