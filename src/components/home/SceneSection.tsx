"use client";

/* ============================================================
   SceneSection — 토스식 사진 장면 (시안 v7)

   스크롤하면 둥근 사진 카드가 화면 가득 펼쳐지고,
   첫 문장 → 두 번째 문장으로 바뀝니다.
   - 스크롤 연동은 CSS(animation-timeline)로 처리 → 자바스크립트 없음, 끊김 없음
   - 지원하지 않는 브라우저·움직임 줄이기: 펼쳐진 사진 위에 두 문장을 모두 표시
   ★ 사진 교체: public/images/home/ 에 새 사진을 넣고 PHOTO 경로와 출처 문구 수정
     (현재: 위키미디어 공용의 인제대 캠퍼스 벚꽃 항공 사진)
============================================================ */

import Image from "next/image";

const PHOTO = "/images/home/inje-campus.jpg"; // 인제대학교 김해캠퍼스 항공 사진 (벚꽃, 2025.4)
// 위키미디어 공용 사진 — CC BY-SA 4.0 라이선스라 출처 표기 필수
const CREDIT = "사진 SMART COOKIEEEEE, CC BY-SA 4.0 (위키미디어 공용)";

export default function SceneSection() {
  return (
    <section aria-label="센터 소개" className="scene-track relative h-[260vh] mt-24 md:mt-32">
      <div className="scene-sticky sticky top-0 h-svh overflow-hidden">
        {/* 사진 카드 (clip-path로 둥근 카드 → 화면 가득) */}
        <div className="scene-photo absolute inset-0 bg-navy-800">
          {/* loading="eager": 스크롤해서 닿는 순간 큰 사진을 불러오면 끊기므로 미리 받아 둠 (우선순위는 낮게) */}
          <Image src={PHOTO} alt="벚꽃이 핀 인제대학교 김해캠퍼스 항공 사진" fill sizes="100vw" loading="eager" fetchPriority="low" quality={70} className="object-cover" />
          {/* 글자가 잘 읽히도록 아래로 갈수록 어둡게 */}
          <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,18,32,.15)_0%,rgba(7,18,32,.35)_45%,rgba(7,18,32,.78)_100%)]" />
        </div>

        <div className="scene-cap1 absolute inset-x-0 bottom-[16%] px-6 text-center text-white">
          <h2 className="text-[34px] sm:text-5xl lg:text-[68px] font-extrabold leading-[1.18] tracking-[-.04em] [text-shadow:0_2px_24px_rgba(7,18,32,.45)]">
            김해의 하루는<br />매일 데이터를 남깁니다
          </h2>
        </div>
        <div className="scene-cap2 absolute inset-x-0 bottom-[16%] px-6 text-center text-white">
          <h2 className="text-[34px] sm:text-5xl lg:text-[68px] font-extrabold leading-[1.18] tracking-[-.04em] [text-shadow:0_2px_24px_rgba(7,18,32,.45)]">
            그 데이터를<br />누구나 믿고 쓸 수 있게
          </h2>
          <p className="mt-4 mx-auto max-w-[30em] text-base sm:text-lg text-white/85">
            인제대학교 데이터거버넌스센터가 수집하고 검증해서 연구와 지역에 돌려드립니다.
          </p>
        </div>

        <span className="absolute right-5 bottom-3.5 text-[11px] text-white/60">{CREDIT}</span>
      </div>
    </section>
  );
}
