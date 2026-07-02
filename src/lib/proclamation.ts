// ============================================================================
// 나만의 공휴일 — '공휴일 선포문' 프리셋 문구 & 캔버스 렌더링
// ----------------------------------------------------------------------------
// 관보/표창장 느낌의 진지·웅장한 선포문을 <canvas>에 직접 그린다.
// 화면 미리보기와 저장 이미지가 100% 동일(WYSIWYG)하며, 외부 의존성/네트워크가
// 전혀 필요 없어 오프라인에서도 확실하게 동작한다. (인스타 스토리 비율 9:16)
// ============================================================================

import { formatKoreanDate } from "./holidays";

/** 선포문 캔버스 해상도 (9:16, 인스타 스토리) */
export const CARD_W = 1080;
export const CARD_H = 1920;

/** 명칭(공휴일 이름) 프리셋 — 클릭하면 채워짐 */
export const NAME_PRESETS: string[] = [
  "엑셀 쳐다보지 않기의 날",
  "아무 생각 없이 풋살만 하는 날",
  "이불 밖은 위험해 기념일",
  "알림 0개 만들기의 날",
  "평일 낮의 카페 정복일",
  "무계획이 곧 계획인 날",
  "월요병 조기 진압 기념일",
  "침대와 물아일체의 날",
];

/** 선포 사유 프리셋 */
export const REASON_PRESETS: string[] = [
  "3일 연속 야근으로 인한 인류애 상실",
  "맑은 날씨를 사무실에서 보내는 것에 대한 위헌적 분노",
  "누적된 번아웃이 임계점에 도달함",
  "지난 분기 나에게 준 것이 아무것도 없음",
  "출근길 지하철에서 이미 방전됨",
  "이번 주 회의 시간 도합 11시간 돌파",
  "그냥. 이유 없이 쉬고 싶어서.",
];

export interface ProclamationData {
  /** "YYYY-MM-DD" */
  date: string;
  /** 공휴일 명칭 */
  name: string;
  /** 선포 사유 */
  reason: string;
  /** 선포 대상 (이름/별명) */
  holder: string;
}

// 폰트 스택 — 윈도우/맥 공통으로 한글 세리프가 잡히도록 폴백을 넉넉히
const SERIF =
  "'Batang', 'Nanum Myeongjo', 'AppleMyungjo', 'Malgun Gothic', serif";
const SANS =
  "'Malgun Gothic', 'Apple SD Gothic Neo', 'Nanum Gothic', sans-serif";

const INK = "#20264a"; // 짙은 먹빛 남색
const GOLD = "#b0862f"; // 금박 테두리
const ACCENT = "#4338ca"; // 강조(날짜/명칭)
const SEAL_RED = "#c0392b"; // 낙관 도장

/** 문자열을 maxWidth에 맞춰 글자 단위로 줄바꿈 (한글 대응) */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const ch of [...text]) {
    if (ch === "\n") {
      lines.push(line);
      line = "";
      continue;
    }
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

/** 글자 수가 많아도 maxLines 안에 들어오도록 폰트를 줄여가며 줄바꿈 */
function fitLines(
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
    lines = wrapText(ctx, text, maxWidth);
    if (lines.length <= maxLines) break;
    px -= 2;
  }
  return { px, lines };
}

/** 자간을 준 가운데 정렬 텍스트 (textAlign은 호출 전에 center로 세팅) */
function centeredSpaced(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  spacing: number
): void {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total =
    widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let x = cx - total / 2;
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], x + widths[i] / 2, y);
    x += widths[i] + spacing;
  }
}

/** 날짜 → 그럴싸한 관보 호수 (연중 일수 기반) "제 2026 - 073 호" */
function issueNo(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const start = Date.UTC(y, 0, 0);
  const cur = Date.UTC(y, m - 1, d);
  const doy = Math.round((cur - start) / 86400000);
  return `제 ${y} - ${String(doy).padStart(3, "0")} 호`;
}

/** 상단 국장(國章) 느낌의 원형 엠블럼 */
function drawEmblem(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.save();
  // 이중 금테 원
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, 74, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 62, 0, Math.PI * 2);
  ctx.stroke();
  // 8방향 햇살
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 80, cy + Math.sin(a) * 80);
    ctx.lineTo(cx + Math.cos(a) * 92, cy + Math.sin(a) * 92);
    ctx.stroke();
  }
  // 중앙 글자 休
  ctx.fillStyle = SEAL_RED;
  ctx.font = `700 66px ${SERIF}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("休", cx, cy + 4);
  ctx.restore();
}

/** 우하단 낙관(붉은 도장) — 篆書풍 4자 "公休之印" */
function drawSeal(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-12 * Math.PI) / 180);
  const s = 94; // 한 변
  ctx.strokeStyle = SEAL_RED;
  ctx.lineWidth = 6;
  // 살짝 둥근 사각 테두리
  const r = 14;
  ctx.beginPath();
  ctx.moveTo(-s / 2 + r, -s / 2);
  ctx.arcTo(s / 2, -s / 2, s / 2, s / 2, r);
  ctx.arcTo(s / 2, s / 2, -s / 2, s / 2, r);
  ctx.arcTo(-s / 2, s / 2, -s / 2, -s / 2, r);
  ctx.arcTo(-s / 2, -s / 2, s / 2, -s / 2, r);
  ctx.closePath();
  ctx.stroke();
  // 4자 2x2 배치
  ctx.fillStyle = SEAL_RED;
  ctx.font = `700 40px ${SERIF}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const chars = ["公", "休", "之", "印"];
  const off = 23;
  ctx.fillText(chars[0], -off, -off);
  ctx.fillText(chars[1], off, -off);
  ctx.fillText(chars[2], -off, off);
  ctx.fillText(chars[3], off, off);
  ctx.restore();
}

/**
 * 선포문을 캔버스 전체에 그린다. (내부 해상도 1080×1920 가정)
 * name/reason이 비어 있으면 안내용 플레이스홀더로 대체해 미리보기가 항상 예쁘게 보인다.
 */
export function drawProclamation(
  ctx: CanvasRenderingContext2D,
  data: ProclamationData
): void {
  const W = CARD_W;
  const H = CARD_H;
  const cx = W / 2;
  const name = data.name.trim() || "○○○의 날";
  const reason = data.reason.trim() || "지친 마음의 긴급 구조가 필요하므로";
  const holder = data.holder.trim() || "본인";
  const dateText = formatKoreanDate(data.date);

  // ── 배경 (아이보리 종이 + 은은한 그라데이션) ─────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#fbf7ea");
  bg.addColorStop(1, "#f3ead2");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ── 테두리 (금박 + 먹선 이중) ───────────────────────────────────────────
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 8;
  ctx.strokeRect(46, 46, W - 92, H - 92);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.strokeRect(70, 70, W - 140, H - 140);
  // 모서리 마름모 장식
  ctx.fillStyle = GOLD;
  for (const [x, y] of [
    [58, 58],
    [W - 58, 58],
    [58, H - 58],
    [W - 58, H - 58],
  ]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-9, -9, 18, 18);
    ctx.restore();
  }

  ctx.textBaseline = "middle";

  // ── 상단 엠블럼 ────────────────────────────────────────────────────────
  drawEmblem(ctx, cx, 258);

  // ── 관보 호수 ──────────────────────────────────────────────────────────
  ctx.fillStyle = "#8a7c55";
  ctx.font = `500 34px ${SANS}`;
  ctx.textAlign = "center";
  centeredSpaced(ctx, issueNo(data.date), cx, 400, 6);

  // ── 제목 ───────────────────────────────────────────────────────────────
  ctx.fillStyle = INK;
  ctx.font = `800 116px ${SERIF}`;
  centeredSpaced(ctx, "공휴일 선포문", cx, 560, 10);
  // 제목 밑줄
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx - 300, 648);
  ctx.lineTo(cx + 300, 648);
  ctx.stroke();

  // ── 본문 ───────────────────────────────────────────────────────────────
  ctx.textAlign = "center";
  let y = 772;
  ctx.fillStyle = INK;
  ctx.font = `400 44px ${SERIF}`;
  ctx.fillText(`위 사람 「${holder}」 은(는) 아래의 날,`, cx, y);

  y += 90;
  ctx.fillStyle = ACCENT;
  ctx.font = `700 66px ${SERIF}`;
  ctx.fillText(dateText, cx, y);

  y += 94;
  ctx.fillStyle = INK;
  ctx.font = `400 44px ${SERIF}`;
  ctx.fillText("을(를) 개인 법정 공휴일로 지정하고,", cx, y);

  y += 78;
  ctx.fillText("그 명칭을 아래와 같이 정하여", cx, y);

  // 명칭 하이라이트 박스 (길면 자동 축소)
  y += 98;
  const nameFit = fitLines(ctx, `「${name}」`, W - 210, 60, 800, SERIF, 1, 32);
  ctx.font = `800 ${nameFit.px}px ${SERIF}`;
  const nameLabel = nameFit.lines[0] ?? `「${name}」`;
  const nw = ctx.measureText(nameLabel).width;
  const boxW = Math.min(nw + 72, W - 176);
  ctx.fillStyle = "rgba(67, 56, 202, 0.08)";
  ctx.fillRect(cx - boxW / 2, y - nameFit.px * 0.82, boxW, nameFit.px * 1.64);
  ctx.fillStyle = ACCENT;
  ctx.fillText(nameLabel, cx, y);

  y += 88;
  ctx.fillStyle = INK;
  ctx.font = `400 44px ${SERIF}`;
  ctx.fillText("이를 엄숙히 선포한다.", cx, y);

  // ── 선포 사유 ──────────────────────────────────────────────────────────
  y += 104;
  ctx.fillStyle = GOLD;
  ctx.font = `700 38px ${SANS}`;
  centeredSpaced(ctx, "◈  선 포 사 유  ◈", cx, y, 4);

  y += 66;
  ctx.fillStyle = "#3a3a3a";
  const reasonFit = fitLines(ctx, `“${reason}”`, W - 200, 44, 400, SERIF, 2, 28);
  ctx.font = `400 ${reasonFit.px}px ${SERIF}`;
  const rlh = reasonFit.px + 14;
  let reasonBottom = y;
  for (const ln of reasonFit.lines) {
    ctx.fillText(ln, cx, y);
    reasonBottom = y;
    y += rlh;
  }

  // ── 공식 효력 ──────────────────────────────────────────────────────────
  y = reasonBottom + 44;
  ctx.strokeStyle = "rgba(176,134,47,0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 330, y);
  ctx.lineTo(cx + 330, y);
  ctx.stroke();

  y += 54;
  ctx.fillStyle = "#5b5b5b";
  const effect =
    "위 사람은 오늘 하루, 모든 사회적 책임과 업무 연락으로부터 합법적으로 면제됨을 이에 확인함.";
  const effFit = fitLines(ctx, effect, W - 240, 34, 400, SANS, 2, 26);
  ctx.font = `400 ${effFit.px}px ${SANS}`;
  const elh = effFit.px + 16;
  let bodyBottom = y;
  for (const ln of effFit.lines) {
    ctx.fillText(ln, cx, y);
    bodyBottom = y;
    y += elh;
  }

  // ── 서명부 & 낙관 (본문 아래로 동적 배치 · 겹침 방지) ──────────────────
  const [yy] = data.date.split("-");
  const footerY = Math.min(Math.max(bodyBottom + 96, 1688), 1724);
  ctx.fillStyle = INK;
  ctx.font = `600 44px ${SERIF}`;
  centeredSpaced(ctx, `${yy}년   나만의 공휴일 위원회`, cx - 26, footerY, 2);

  drawSeal(ctx, W - 182, footerY + 56);
}
