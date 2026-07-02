// ============================================================================
// 나만의 공휴일 — '부재중(OOO)' 상태 짤 생성 (1:1 정사각, 카톡 프로필/피드용)
// ----------------------------------------------------------------------------
// 말투(무드) 프리셋을 고르면 공휴일 이름이 들어간 자동응답 멘트가 채워진다.
// 선포문과 마찬가지로 <canvas>에 직접 렌더 — 미리보기 = 저장 이미지, 오프라인 동작.
// ============================================================================

import { formatKoreanDate } from "./holidays";

export const OOO_W = 1080;
export const OOO_H = 1080;

export interface Vibe {
  key: string;
  /** 버튼에 보일 이름 */
  label: string;
  /** 카드 상단 대표 이모지 */
  emoji: string;
  /** 멘트 템플릿 — {h}=공휴일 명칭 */
  message: (h: string) => string;
}

/** 감정/성향별 부재중 멘트 프리셋 (AI 대신) */
export const VIBES: Vibe[] = [
  {
    key: "polite",
    label: "정중하게",
    emoji: "🙇",
    message: (h) =>
      `현재 「${h}」을(를) 맞아 잠시 자리를 비웁니다. 급한 용무는 내일의 저에게 남겨주시면 순차적으로 확인하겠습니다.`,
  },
  {
    key: "sassy",
    label: "까칠하게",
    emoji: "🙅",
    message: (h) =>
      `네, 저 오늘 「${h}」입니다. 연락은 정중히 사양합니다. 세상은 저 없이도 잘 돌아가더라고요.`,
  },
  {
    key: "playful",
    label: "능청맞게",
    emoji: "🌴",
    message: (h) =>
      `담당자는 「${h}」로 인해 지구 어딘가에서 행복을 충전 중입니다. 삐- 소리 후 메시지를 남겨주세요. 확인은… 글쎄요.`,
  },
  {
    key: "burnout",
    label: "무기력하게",
    emoji: "💤",
    message: (h) =>
      `죄송합니다. 「${h}」를 맞아 영혼이 잠시 가출했습니다. 몸은 침대에, 정신은 우주 어딘가에 있습니다.`,
  },
  {
    key: "hyped",
    label: "신나게",
    emoji: "🎉",
    message: (h) =>
      `오늘은 「${h}」!! 저는 지금 세상에서 제일 신난 사람입니다. 업무요? 그게 뭐죠? 내일 봐요!`,
  },
];

const SANS =
  "'Malgun Gothic', 'Apple SD Gothic Neo', 'Nanum Gothic', sans-serif";
const EMOJI = "'Segoe UI Emoji', 'Apple Color Emoji', sans-serif";

export interface OOOData {
  /** "YYYY-MM-DD" */
  date: string;
  /** 공휴일 명칭 */
  holiday: string;
  /** 부재중 멘트 (수정 가능) */
  message: string;
  /** 대표 이모지 */
  emoji: string;
}

/** 글자 단위 줄바꿈 (한글 대응) */
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const ch of [...text]) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** maxLines에 맞을 때까지 폰트를 줄여가며 줄바꿈 */
function fit(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startPx: number,
  weight: number,
  family: string,
  maxLines: number,
  minPx: number
): { px: number; lines: string[] } {
  let px = startPx;
  let lines: string[] = [];
  while (px >= minPx) {
    ctx.font = `${weight} ${px}px ${family}`;
    lines = wrap(ctx, text, maxWidth);
    if (lines.length <= maxLines) break;
    px -= 2;
  }
  return { px, lines };
}

/** 둥근 사각형 경로 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawOutOfOffice(
  ctx: CanvasRenderingContext2D,
  data: OOOData
): void {
  const W = OOO_W;
  const H = OOO_H;
  const cx = W / 2;
  const holiday = data.holiday.trim() || "나만의 공휴일";
  const message =
    data.message.trim() ||
    `현재 「${holiday}」을(를) 맞아 자리를 비웠습니다.`;
  const emoji = data.emoji || "🌴";

  // ── 배경 그라데이션 ─────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#eef2ff");
  bg.addColorStop(1, "#fde8f3");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ── 카드 패널 ───────────────────────────────────────────────────────────
  ctx.save();
  ctx.shadowColor = "rgba(79,70,229,0.20)";
  ctx.shadowBlur = 48;
  ctx.shadowOffsetY = 22;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 82, 112, 916, 856, 48);
  ctx.fill();
  ctx.restore();

  // ── 상단 상태 배지 (🔴 부재중 · OUT OF OFFICE) ──────────────────────────
  ctx.textBaseline = "middle";
  const pillY = 208;
  const pillLabel = "부재중 · OUT OF OFFICE";
  ctx.font = `700 30px ${SANS}`;
  const textW = ctx.measureText(pillLabel).width;
  const pillW = textW + 108;
  const pillX = cx - pillW / 2;
  ctx.fillStyle = "#fee2e2";
  roundRect(ctx, pillX, pillY - 34, pillW, 68, 34);
  ctx.fill();
  // 빨간 점
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(pillX + 44, pillY, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#b91c1c";
  ctx.textAlign = "left";
  ctx.fillText(pillLabel, pillX + 70, pillY + 1);

  // ── 대표 이모지 ─────────────────────────────────────────────────────────
  ctx.textAlign = "center";
  ctx.font = `128px ${EMOJI}`;
  ctx.fillText(emoji, cx, 372);

  // ── 라벨 + 공휴일 제목 ──────────────────────────────────────────────────
  ctx.fillStyle = "#9aa2b1";
  ctx.font = `600 32px ${SANS}`;
  ctx.fillText("지금 이 사람은", cx, 470);

  const titleFit = fit(ctx, `「${holiday}」 중`, W - 260, 62, 800, SANS, 1, 34);
  ctx.font = `800 ${titleFit.px}px ${SANS}`;
  ctx.fillStyle = "#4338ca";
  ctx.fillText(titleFit.lines[0], cx, 536);

  // ── 부재중 멘트 ─────────────────────────────────────────────────────────
  const msgFit = fit(ctx, message, W - 240, 40, 400, SANS, 4, 28);
  ctx.font = `400 ${msgFit.px}px ${SANS}`;
  ctx.fillStyle = "#3f4658";
  const lh = msgFit.px + 18;
  let y = 636;
  for (const ln of msgFit.lines) {
    ctx.fillText(ln, cx, y);
    y += lh;
  }

  // ── 구분선 ──────────────────────────────────────────────────────────────
  const divY = 872;
  ctx.strokeStyle = "#eceef5";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(180, divY);
  ctx.lineTo(W - 180, divY);
  ctx.stroke();

  // ── 하단: 날짜 + 브랜딩 ─────────────────────────────────────────────────
  ctx.fillStyle = "#8890a0";
  ctx.font = `600 30px ${SANS}`;
  ctx.fillText(`오늘 하루 · ${formatKoreanDate(data.date)}`, cx, 916);

  ctx.font = `700 30px ${SANS}`;
  ctx.fillStyle = "#a78bfa";
  ctx.fillText("🏖️ 나만의 공휴일", cx, 1010);
}
