"use client";

// ============================================================================
// ClickFX — 전역 클릭 이펙트. 어디를 눌러도 커서 위치에서 파티클이 터지고
//           종류에 맞는 효과음이 난다. 우하단에 음소거 토글 제공.
// ----------------------------------------------------------------------------
// - 파티클은 Web Animations API로 DOM span을 잠깐 띄웠다 지운다(CSS 키프레임 X).
// - 사운드는 sfx()가 pointerdown(=사용자 제스처) 안에서 호출돼 자동재생 정책 OK.
// - prefers-reduced-motion이면 파티클 수를 확 줄인다(사운드는 유지).
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { loadMutePref, setMuted, sfx, type SfxKind } from "@/lib/sfx";

// 테마 팔레트(골드/크림슨/아이보리/라이트골드)
const COLORS = ["#ffae2e", "#f6042e", "#f4eee3", "#ffd27a"];

/** 클릭된 요소로부터 어떤 효과음/이펙트를 낼지 판별 */
function kindFor(target: EventTarget | null): SfxKind {
  const el = target instanceof Element ? target : null;
  if (!el) return "tick";

  // 1) 명시적으로 data-sfx를 단 요소가 우선
  const tagged = el.closest("[data-sfx]");
  const explicit = tagged?.getAttribute("data-sfx");
  if (explicit) return explicit as SfxKind;

  // 2) 비활성(disabled / cursor-not-allowed) 요소 → 에러음
  const btn = el.closest("button");
  if (btn?.disabled) return "error";
  if (el.closest(".cursor-not-allowed")) return "error";

  // 3) 일반 상호작용 요소
  if (el.closest("button, a, [role='button'], summary")) return "pop";
  if (el.closest("input, textarea, select, label")) return "select";

  // 4) 그 외 배경 클릭
  return "tick";
}

/** 종류에 따른 파티클 강도 */
function intensityFor(kind: SfxKind): { count: number; spread: number; ring: boolean } {
  switch (kind) {
    case "sparkle":
      return { count: 22, spread: 150, ring: true };
    case "dice":
      return { count: 16, spread: 120, ring: true };
    case "pop":
      return { count: 12, spread: 95, ring: true };
    case "select":
      return { count: 10, spread: 80, ring: true };
    case "error":
      return { count: 8, spread: 60, ring: false };
    case "tick":
    default:
      return { count: 5, spread: 45, ring: false };
  }
}

export default function ClickFX() {
  const layerRef = useRef<HTMLDivElement>(null);
  const [muted, setMutedState] = useState(false);

  // 저장된 음소거 설정을 localStorage에서 1회 동기화
  // (SSR에선 기본값 false로 렌더 → 마운트 후 실제 값 반영)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMutedState(loadMutePref());
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onDown = (e: PointerEvent) => {
      // 마우스 왼쪽/터치/펜만 (오른쪽 클릭·보조 버튼 제외)
      if (e.button !== 0) return;
      const kind = kindFor(e.target);
      sfx(kind); // 제스처 컨텍스트 안에서 재생 → 자동재생 정책 통과
      burst(layerRef.current, e.clientX, e.clientY, kind, reduce);
    };

    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) sfx("sparkle"); // 켜는 순간 소리로 확인시켜주기
  };

  return (
    <>
      {/* 파티클 레이어 — 화면 최상단, 클릭 통과 */}
      <div
        ref={layerRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
      />

      {/* 음소거 토글 */}
      <button
        type="button"
        onClick={toggleMute}
        data-sfx="tick"
        aria-label={muted ? "효과음 켜기" : "효과음 끄기"}
        title={muted ? "효과음 켜기" : "효과음 끄기"}
        className="fixed bottom-4 right-4 z-[101] flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg shadow-lg shadow-black/40 backdrop-blur transition hover:border-gold/40 hover:text-gold active:scale-95"
      >
        {muted ? "🔇" : "🔊"}
      </button>
    </>
  );
}

/** 클릭 지점에서 파티클 버스트(+ 선택적 링 리플)를 생성·애니메이트·정리 */
function burst(
  layer: HTMLDivElement | null,
  x: number,
  y: number,
  kind: SfxKind,
  reduce: boolean
) {
  if (!layer) return;
  const { count, spread, ring } = intensityFor(kind);
  const n = reduce ? Math.min(4, Math.ceil(count / 3)) : count;

  // 중앙 링 리플
  if (ring && !reduce) {
    const r = document.createElement("span");
    const accent = kind === "error" ? COLORS[1] : COLORS[0];
    r.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:9999px;border:2px solid ${accent};opacity:.85;will-change:transform,opacity;`;
    layer.appendChild(r);
    r.animate(
      [
        { transform: "scale(0.3)", opacity: 0.85 },
        { transform: "scale(5)", opacity: 0 },
      ],
      { duration: 460, easing: "cubic-bezier(.15,.7,.25,1)" }
    ).onfinish = () => r.remove();
  }

  // 방사형 파티클
  for (let i = 0; i < n; i++) {
    const p = document.createElement("span");
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const size = 4 + Math.random() * (kind === "sparkle" ? 8 : 5);
    const angle = Math.random() * Math.PI * 2;
    const dist = spread * (0.35 + Math.random() * 0.65);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    // 별(sparkle)은 일부를 마름모꼴로
    const star = kind === "sparkle" && Math.random() < 0.4;

    p.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;margin:${-size / 2}px 0 0 ${-size / 2}px;background:${color};border-radius:${star ? "2px" : "9999px"};box-shadow:0 0 ${size}px ${color}88;will-change:transform,opacity;`;
    layer.appendChild(p);

    const dur = 460 + Math.random() * 420;
    p.animate(
      [
        {
          transform: `translate(0,0) scale(1) rotate(0deg)`,
          opacity: 1,
        },
        {
          // 중력 느낌으로 살짝 아래로 더 흐르게
          transform: `translate(${dx}px, ${dy + 18}px) scale(0.2) rotate(${star ? 180 : 0}deg)`,
          opacity: 0,
        },
      ],
      { duration: dur, easing: "cubic-bezier(.12,.66,.28,1)" }
    ).onfinish = () => p.remove();
  }
}
