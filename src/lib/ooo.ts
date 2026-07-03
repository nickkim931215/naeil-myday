// ============================================================================
// 나만의 공휴일 — '부재중(OOO)' 상태 짤 생성 (1:1 정사각, 카톡 프로필/피드용)
// ----------------------------------------------------------------------------
// 실제 '일력(日曆·뜯는 달력)' 느낌으로 렌더한다. 선택한 날짜를 큼직하게 보여주고,
// 그 아래에 말투(무드)별 부재중 자동응답 멘트를 얹는다.
// 선포문과 마찬가지로 <canvas>에 직접 렌더 — 미리보기 = 저장 이미지, 오프라인 동작.
// ============================================================================

import { WEEKDAY_LABELS, getWeekday } from "./holidays";

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
const SERIF =
  "'Batang', 'Nanum Myeongjo', 'AppleMyungjo', 'Malgun Gothic', serif";
const EMOJI = "'Segoe UI Emoji', 'Apple Color Emoji', sans-serif";

// 달력 팔레트 — 웹 테마와 맞춘 크림슨/골드/먹색
const CAL_RED = "#e5162f"; // 공휴일 빨강(일력 헤더·날짜)
const INK = "#20242e"; // 먹색 텍스트
const SUBINK = "#8a8f9c"; // 보조 텍스트
const GOLD = "#9a6f1e"; // 명칭 강조(밝은 배경용 딥 골드)

const WEEKDAY_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_EN = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

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

  const [yNum, mNum, dNum] = data.date.split("-").map(Number);
  const wIdx = getWeekday(data.date);
  const weekdayKo = WEEKDAY_LABELS[wIdx]; // 예: "금"
  const weekdayEn = WEEKDAY_EN[wIdx];
  const monthEn = MONTH_EN[mNum - 1];

  // ── 배경 (은은한 미색) ──────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#f3ede1");
  bg.addColorStop(1, "#e9e1d2");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ── 달력 종이 패널 ──────────────────────────────────────────────────────
  const px = 78;
  const py = 96;
  const pw = W - px * 2;
  const ph = H - py * 2 - 30;
  const radius = 40;
  ctx.save();
  ctx.shadowColor = "rgba(40,30,20,0.28)";
  ctx.shadowBlur = 46;
  ctx.shadowOffsetY = 20;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, px, py, pw, ph, radius);
  ctx.fill();
  ctx.restore();

  // ── 상단 빨강 헤더 밴드(연/월) — 패널에 클립해 위 모서리만 둥글게 ────────
  const headerH = 150;
  ctx.save();
  roundRect(ctx, px, py, pw, ph, radius);
  ctx.clip();
  ctx.fillStyle = CAL_RED;
  ctx.fillRect(px, py, pw, headerH);
  ctx.restore();

  // 일력 바인더 링(펀치 홀) 2개
  ctx.fillStyle = "#d9d2c4";
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 2;
  for (const rx of [cx - 130, cx + 130]) {
    ctx.beginPath();
    ctx.arc(rx, py, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // 헤더 텍스트: 좌 "2026년 8월" · 우 "AUGUST"
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.font = `800 46px ${SANS}`;
  ctx.fillText(`${yNum}년 ${mNum}월`, px + 54, py + headerH / 2 + 2);
  ctx.textAlign = "right";
  ctx.font = `600 30px ${SANS}`;
  ctx.fillText(monthEn, px + pw - 54, py + headerH / 2 + 2);

  // ── 요일 (공휴일이므로 붉게) ────────────────────────────────────────────
  const bodyTop = py + headerH;
  ctx.textAlign = "center";
  ctx.fillStyle = CAL_RED;
  ctx.font = `700 54px ${SANS}`;
  ctx.fillText(`${weekdayKo}요일`, cx, bodyTop + 78);
  ctx.fillStyle = SUBINK;
  ctx.font = `600 26px ${SANS}`;
  ctx.fillText(`${weekdayEn} · 나만의 공휴일`, cx, bodyTop + 126);

  // ── 거대한 날짜 숫자 ────────────────────────────────────────────────────
  ctx.fillStyle = CAL_RED;
  ctx.font = `800 300px ${SERIF}`;
  ctx.textBaseline = "middle";
  ctx.fillText(String(dNum), cx, bodyTop + 300);

  // ── 공휴일 명칭 (골드 밴드) ─────────────────────────────────────────────
  const nameY = bodyTop + 486;
  const nameFit = fit(ctx, `「${holiday}」`, pw - 180, 44, 800, SANS, 1, 28);
  ctx.font = `800 ${nameFit.px}px ${SANS}`;
  const nameLabel = nameFit.lines[0];
  const nameW = ctx.measureText(nameLabel).width;
  const bandW = Math.min(nameW + 72, pw - 120);
  ctx.fillStyle = "rgba(255,174,46,0.18)";
  roundRect(ctx, cx - bandW / 2, nameY - 38, bandW, 76, 22);
  ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.textBaseline = "middle";
  ctx.fillText(nameLabel, cx, nameY + 1);

  // ── 구분선 ──────────────────────────────────────────────────────────────
  const divY = nameY + 78;
  ctx.strokeStyle = "#ece7dc";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px + 90, divY);
  ctx.lineTo(px + pw - 90, divY);
  ctx.stroke();

  // ── 부재중 배지 (🔴 부재중 · OUT OF OFFICE) ────────────────────────────
  const pillY = divY + 62;
  const pillLabel = `${emoji} 부재중 · OUT OF OFFICE`;
  ctx.font = `700 30px ${SANS}`;
  ctx.textAlign = "center";
  const textW = ctx.measureText(pillLabel).width;
  const pillW = textW + 68;
  ctx.fillStyle = "#fdeaec";
  roundRect(ctx, cx - pillW / 2, pillY - 34, pillW, 68, 34);
  ctx.fill();
  ctx.fillStyle = "#b3121f";
  ctx.textBaseline = "middle";
  ctx.fillText(pillLabel, cx, pillY + 1);

  // ── 부재중 멘트 ─────────────────────────────────────────────────────────
  const msgFit = fit(ctx, message, pw - 150, 34, 400, SANS, 3, 24);
  ctx.font = `400 ${msgFit.px}px ${SANS}`;
  ctx.fillStyle = "#454b57";
  const lh = msgFit.px + 16;
  let my = pillY + 78;
  for (const ln of msgFit.lines) {
    ctx.fillText(ln, cx, my);
    my += lh;
  }

  // ── 하단 브랜딩 ─────────────────────────────────────────────────────────
  ctx.fillStyle = INK;
  ctx.font = `700 30px ${SANS}`;
  ctx.fillText("🏖️ 나만의 공휴일", cx, py + ph - 44);
}
