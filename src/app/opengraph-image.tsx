// 링크 언펄(카톡·슬랙·트위터 미리보기)용 OG 이미지 — 다크 골드/크림슨 브랜드
// 한글 렌더를 위해 시스템/번들 폰트를 읽어 satori에 주입한다.
// 폰트를 못 찾아도(배포 환경 등) 이미지 생성은 실패하지 않고 기본 폰트로 폴백한다.
import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";

export const alt = "나만의 공휴일 — 지루한 평일 하루를 나만의 공휴일로";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** 한글 지원 폰트 데이터를 찾을 수 있으면 반환 (없으면 null → 기본 폰트 폴백) */
function loadKoreanFont(): ArrayBuffer | null {
  const candidates = [
    // 1) 프로젝트에 폰트를 직접 넣어두면 최우선 (배포 환경 대응)
    `${process.cwd()}/public/fonts/korean.ttf`,
    // 2) 로컬 개발 환경(윈도우/맥) 시스템 폰트
    "C:/Windows/Fonts/malgun.ttf",
    "C:/Windows/Fonts/malgunbd.ttf",
    "/System/Library/Fonts/Supplemental/AppleGothic.ttf",
  ];
  for (const p of candidates) {
    try {
      const buf = readFileSync(p);
      return buf.buffer.slice(
        buf.byteOffset,
        buf.byteOffset + buf.byteLength
      ) as ArrayBuffer;
    } catch {
      // 다음 후보로
    }
  }
  return null;
}

export default function OpenGraphImage() {
  const font = loadKoreanFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(120% 80% at 50% -10%, rgba(255,174,46,0.22), transparent 55%), radial-gradient(120% 90% at 50% 110%, rgba(246,4,46,0.20), transparent 55%), #020005",
          color: "#f4eee3",
          fontFamily: font ? "Korean" : "sans-serif",
          padding: "72px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            fontSize: 34,
            fontWeight: 700,
            color: "#ffae2e",
            border: "2px solid rgba(255,174,46,0.35)",
            borderRadius: "999px",
            padding: "10px 28px",
            marginBottom: "40px",
          }}
        >
          🏖️ 나만의 공휴일
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 58,
            fontWeight: 700,
            textAlign: "center",
            letterSpacing: "-1px",
          }}
        >
          예수님, 부처님도 하루씩 쉬시는데
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 104,
            fontWeight: 800,
            textAlign: "center",
            marginTop: "10px",
            color: "#ffae2e",
            letterSpacing: "-2px",
          }}
        >
          저는요?
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 36,
            fontWeight: 600,
            color: "#a1968b",
            marginTop: "44px",
          }}
        >
          평일 하루를 골라, 나만의 공휴일로 선포하세요
        </div>
      </div>
    ),
    {
      ...size,
      ...(font
        ? { fonts: [{ name: "Korean", data: font, style: "normal" as const }] }
        : {}),
    }
  );
}
