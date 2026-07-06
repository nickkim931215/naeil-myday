// iOS 홈스크린용 앱 아이콘 (180×180 PNG). src/app/icon.svg와 동일한 로고를
// 인라인 SVG로 재사용한다(배포 함수 번들에 소스 파일이 없을 수 있어 fs 대신 인라인).
// iOS가 자체적으로 둥근 마스크를 씌우므로 라운드 스퀘어 그대로 두어도 자연스럽다.
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// icon.svg와 반드시 동일하게 유지할 것 (디자인 단일 소스)
const LOGO_SVG = `<svg width="180" height="180" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="40" y1="20" x2="472" y2="492" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffc357"/>
      <stop offset="0.5" stop-color="#ff7a1f"/>
      <stop offset="1" stop-color="#f6042e"/>
    </linearGradient>
    <radialGradient id="glow" cx="256" cy="306" r="140" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffd98a" stop-opacity="0.6"/>
      <stop offset="1" stop-color="#ffd98a" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="card"><rect x="104" y="132" width="304" height="272" rx="40"/></clipPath>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <rect x="185" y="94" width="30" height="60" rx="15" fill="#0d0812"/>
  <rect x="297" y="94" width="30" height="60" rx="15" fill="#0d0812"/>
  <rect x="104" y="132" width="304" height="272" rx="40" fill="#0d0812"/>
  <g clip-path="url(#card)">
    <rect x="104" y="132" width="304" height="78" fill="#ffae2e"/>
    <rect x="150" y="164" width="46" height="14" rx="7" fill="#0d0812" opacity="0.35"/>
    <rect x="233" y="164" width="46" height="14" rx="7" fill="#0d0812" opacity="0.35"/>
    <rect x="316" y="164" width="46" height="14" rx="7" fill="#0d0812" opacity="0.35"/>
  </g>
  <circle cx="256" cy="306" r="132" fill="url(#glow)"/>
  <path d="M256 221 L276.57 276.68 L335.89 279.04 L289.29 315.82 L305.38 372.96 L256 340 L206.62 372.96 L222.71 315.82 L176.11 279.04 L235.43 276.68 Z" fill="#f6042e" stroke="#ffce4d" stroke-width="9" stroke-linejoin="round"/>
</svg>`;

export default function AppleIcon() {
  const dataUri = `data:image/svg+xml;base64,${Buffer.from(LOGO_SVG).toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "#0d0812",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUri} width={180} height={180} alt="" />
      </div>
    ),
    { ...size }
  );
}
