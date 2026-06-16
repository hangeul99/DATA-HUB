"use client";

import Image from "next/image";
import { useState } from "react";

interface LogoImageProps {
  size?: number;
  className?: string;
  dark?: boolean;
}

// 로고 컴포넌트 — 이미지 깨질 경우 자동으로 텍스트 폴백 표시
export default function LogoImage({ size = 40, className = "", dark = false }: LogoImageProps) {
  const [error, setError] = useState(false);

  if (error) {
    // 로고 이미지 없을 때 텍스트로 대체
    return (
      <div
        className={`flex items-center justify-center rounded-xl font-black text-white text-xs bg-brand-600 flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        IU
      </div>
    );
  }

  return (
    <div className={`relative flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
      <Image
        src="/logo.png"
        alt="인제대학교 데이터거버넌스센터 로고"
        fill
        sizes={`${size}px`}
        style={{ objectFit: "contain" }}
        priority
        draggable={false}
        onError={() => setError(true)}
      />
    </div>
  );
}
