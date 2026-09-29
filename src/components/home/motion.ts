"use client";

/* ============================================================
   motion.ts — 홈 화면 섹션들이 같이 쓰는 모션 도우미

   ★ 원칙: 내용은 "보이는 상태"가 기본값.
     스크립트가 늦거나 실패해도 글자가 사라지지 않도록,
     첫 화면 아래에 있는 요소만 잠깐 숨겼다가 스크롤로 들어오면 보여줌.
============================================================ */

import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

/** 사용자가 OS에서 "움직임 줄이기"를 켰는지 확인 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * 컨테이너 안의 `.reveal` 요소들을 스크롤 진입 시 페이드업.
 * - 첫 화면(뷰포트) 안에 이미 있는 요소는 건드리지 않음 → 깜빡임 없음
 * - 컴포넌트가 사라지면 observer 정리 (메모리 누수 방지)
 * @param deps 목록이 바뀌어 새 요소가 생길 때 다시 등록하기 위한 값
 */
export function useReveal(containerRef: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  useEffect(() => {
    const root = containerRef.current;
    if (!root || prefersReducedMotion()) return;

    const vh = window.innerHeight;
    const targets = Array.from(root.querySelectorAll<HTMLElement>(".reveal")).filter(
      (el) => el.getBoundingClientRect().top > vh * 0.92 && !el.dataset.revealed,
    );
    targets.forEach((el) => el.classList.add("reveal-pre"));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          el.classList.remove("reveal-pre");
          el.dataset.revealed = "1"; // 한 번 보여준 요소는 다시 숨기지 않음
          observer.unobserve(el);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    targets.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      // 정리 시 숨김 상태가 남지 않도록 복구
      targets.forEach((el) => el.classList.remove("reveal-pre"));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * 요소가 화면에 한 번이라도 들어왔는지 (카운트업·진행선 시작 신호용)
 */
export function useInViewOnce(ref: RefObject<HTMLElement | null>, threshold = 0.3): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 움직임 줄이기 설정이어도 "진입 신호"는 똑같이 받고, 애니메이션 쪽에서 즉시 완료 처리함

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setInView(true); observer.disconnect(); }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, threshold]);

  return inView;
}

/**
 * "움직임 줄이기" 설정을 React 상태처럼 구독 (설정을 바꾸면 즉시 반영)
 * 서버 렌더링에서는 false로 시작 → 화면 깨짐 없음
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}
