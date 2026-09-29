"use client";

/* ============================================================
   FeaturedDatasets — 지금 많이 찾는 데이터 (시안 v7)

   다운로드 상위 데이터셋 카드가 왼쪽으로 끊김 없이 흘러갑니다.
   - 같은 카드 묶음을 2벌 이어 붙이고 -50%까지 흘려서 무한 반복 (복제본은 스크린리더·탭 이동 제외)
   - 마우스를 올리면 멈추지 않고 천천히 흐름 (속도 1 → 0.25)
   - 멈춤/재생 버튼 제공 (움직이는 콘텐츠는 멈출 수 있어야 하는 접근성 기준)
   - 화면 밖이면 정지, 움직임 줄이기 설정이면 손으로 넘기는 가로 스크롤
============================================================ */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Pause, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useReducedMotion, useReveal } from "./motion";

interface Dataset {
  id: string;
  title: string;
  category: string;
  year: string | null;
  description: string | null;
  downloads: number;
  file_path: string | null;
  created_at: string;
}

/** 파일 경로에서 확장자 추출 → "CSV", "XLSX" 등 */
function fileFormat(path: string | null): string | null {
  const ext = path?.split(".").pop();
  return ext && ext !== path && ext.length <= 5 ? ext.toUpperCase() : null;
}

const SPEED = 40; // 초당 이동 px

export default function FeaturedDatasets() {
  const sectionRef = useRef<HTMLElement>(null);
  const maskRef = useRef<HTMLDivElement>(null);
  const beltRef = useRef<HTMLDivElement>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion(); // 움직임 줄이기 → 흐르지 않고 손으로 넘김

  useReveal(sectionRef);

  // ── 다운로드 상위 8개 ──
  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("datasets")
      .select("id, title, category, year, description, downloads, file_path, created_at")
      .eq("is_active", true)
      .order("downloads", { ascending: false })
      .limit(8)
      .then(({ data }) => { if (!cancelled) setDatasets(data ?? []); });
    return () => { cancelled = true; };
  }, []);

  // ── 배지: 최다 다운로드 1개 = 인기, 가장 최근 등록 2개 = 신규 ──
  const badges = useMemo(() => {
    const map = new Map<string, "신규" | "인기">();
    if (datasets.length === 0) return map;
    map.set(datasets[0].id, "인기");
    [...datasets]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 2)
      .forEach((d) => map.set(d.id, "신규"));
    return map;
  }, [datasets]);

  // 카드가 적으면 화면을 채우도록 반복 → 그 묶음을 2벌 (두 번째 벌은 복제본)
  const loop = useMemo(() => {
    if (datasets.length === 0) return [];
    const times = Math.max(1, Math.ceil(6 / datasets.length));
    return Array.from({ length: times }, () => datasets).flat();
  }, [datasets]);

  // ── 흐름 속도·정지 제어 (Web Animations API로 CSS 애니메이션 속도만 조절) ──
  useEffect(() => {
    const mask = maskRef.current, belt = beltRef.current;
    if (!mask || !belt || loop.length === 0 || reduce) return;

    // 카드 수와 상관없이 일정한 속도
    belt.style.setProperty("--dur", `${(belt.scrollWidth / 2 / SPEED).toFixed(1)}s`);

    // 화면 밖이면 정지 (배터리 절약)
    const io = new IntersectionObserver(([e]) => { belt.style.animationPlayState = e.isIntersecting ? "" : "paused"; });
    io.observe(mask);

    // 마우스를 올리면 1 → 0.25로 부드럽게 감속, 떠나면 원래 속도
    let rate = 1, target = 1, raf = 0;
    const ease = () => {
      rate += (target - rate) * 0.12;
      const anim = belt.getAnimations()[0];
      if (anim) anim.playbackRate = rate;
      raf = Math.abs(target - rate) > 0.01 ? requestAnimationFrame(ease) : 0;
    };
    const onEnter = (e: PointerEvent) => { if (e.pointerType === "mouse") { target = 0.25; if (!raf) raf = requestAnimationFrame(ease); } };
    const onLeave = () => { target = 1; if (!raf) raf = requestAnimationFrame(ease); };
    mask.addEventListener("pointerenter", onEnter);
    mask.addEventListener("pointerleave", onLeave);

    return () => {
      io.disconnect(); cancelAnimationFrame(raf);
      mask.removeEventListener("pointerenter", onEnter);
      mask.removeEventListener("pointerleave", onLeave);
    };
  }, [loop.length, reduce]);

  const renderCard = (ds: Dataset, key: string, clone: boolean) => {
    const badge = badges.get(ds.id);
    const fmt = fileFormat(ds.file_path);
    return (
      <Link
        key={key}
        href={`/datasets/${ds.id}`}
        aria-hidden={clone || undefined}
        tabIndex={clone ? -1 : undefined}
        className="flex min-h-[252px] w-[min(340px,78vw)] flex-none flex-col rounded-3xl bg-white p-7 shadow-[inset_0_0_0_1px_#E3E7EC] [transition:translate_300ms_var(--ease-out),box-shadow_300ms] [@media(hover:hover)]:hover:-translate-y-1.5 [@media(hover:hover)]:hover:shadow-[inset_0_0_0_1px_#E3E7EC,0_24px_50px_-24px_rgba(20,26,34,.28)]"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-brand-600">
          {ds.category.replace(" 데이터", "")}
          {badge && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${badge === "신규" ? "bg-brand-500 text-white" : "bg-[#FFE7A3] text-[#5C3D00]"}`}>
              {badge}
            </span>
          )}
        </span>
        <h3 className="mt-3 text-[21px] font-extrabold leading-snug tracking-[-.03em] text-neutral-900 line-clamp-2">{ds.title}</h3>
        <p className="mb-5 mt-2.5 text-base leading-relaxed text-neutral-600 line-clamp-2">{ds.description}</p>
        <div className="mt-auto flex justify-between border-t border-neutral-200 pt-4 text-sm text-neutral-500">
          <span>{[fmt, ds.year].filter(Boolean).join(", ")}</span>
          <span>다운로드 <b className="text-neutral-900 tabular-nums">{ds.downloads.toLocaleString()}</b></span>
        </div>
      </Link>
    );
  };

  if (datasets.length === 0) return null; // 데이터가 없으면 섹션 자체를 숨김

  return (
    <section ref={sectionRef} className="overflow-hidden pb-28 pt-32 md:pt-36">
      <h2 className="reveal px-6 text-center text-[32px] sm:text-[44px] lg:text-[52px] font-extrabold leading-[1.2] tracking-[-.035em] text-neutral-900">
        지금 많이 찾는 데이터
      </h2>

      <div ref={maskRef}
        className={`mt-11 py-2 pb-7 ${reduce ? "overflow-x-auto" : "marquee-mask overflow-hidden"} ${paused ? "marquee-paused" : ""}`}>
        <div ref={beltRef} className={`flex w-max gap-4 pl-4 ${reduce ? "" : "marquee-belt"}`}>
          {loop.map((ds, i) => renderCard(ds, `a-${i}-${ds.id}`, false))}
          {!reduce && loop.map((ds, i) => renderCard(ds, `b-${i}-${ds.id}`, true))}
        </div>
      </div>

      {!reduce && (
        <div className="flex justify-center">
          <button type="button" onClick={() => setPaused((p) => !p)} aria-pressed={paused}
            aria-label={paused ? "다시 움직이기" : "움직임 멈추기"}
            className="press flex h-11 w-11 items-center justify-center rounded-full bg-[#F3F5F7] text-neutral-900 hover:bg-neutral-200">
            {paused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
          </button>
        </div>
      )}
    </section>
  );
}
