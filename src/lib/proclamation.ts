// ============================================================================
// 나만의 공휴일 — '공휴일 선포문' 프리셋 문구 & 캔버스 렌더링
// ----------------------------------------------------------------------------
// 실제 정부 공문서(公文書) 서식을 본떠 <canvas>에 직접 그린다.
// 발행기관 · 문서번호 · 결재란 · 수신/제목 · 번호 항목(가·나·다) · 관인(官印)까지.
// 화면 미리보기 = 저장 이미지(WYSIWYG), 외부 의존성/네트워크 없이 오프라인 동작.
// (인스타 스토리 비율 9:16)
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
  /** 이미지 하단에 새길 사이트 주소(워터마크). 비우면 표기 생략 */
  site?: string;
}

// 폰트 스택 — 윈도우/맥 공통으로 한글이 잡히도록 폴백을 넉넉히
const SERIF =
  "'Batang', 'Nanum Myeongjo', 'AppleMyungjo', 'Malgun Gothic', serif";
const SANS =
  "'Malgun Gothic', 'Apple SD Gothic Neo', 'Nanum Gothic', sans-serif";

const INK = "#1e2330"; // 공문 본문 먹색(딥 네이비블랙)
const SUBINK = "#565b68"; // 보조 텍스트(라벨/메타)
const GOLD = "#b0862f"; // 국장 금선(절제해서 사용)
const SEAL_RED = "#c22a1c"; // 관인·강조 붉은색
const RULE = "#232838"; // 굵은 괘선
const HAIR = "rgba(30,35,48,0.28)"; // 가는 괘선

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

/** 자간을 준 왼쪽 정렬 라벨을 x에서 시작해 그림 → 끝난 x 반환 */
function spacedLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number
): number {
  ctx.textAlign = "left";
  let lx = x;
  for (const ch of [...text]) {
    const w = ctx.measureText(ch).width;
    ctx.fillText(ch, lx, y);
    lx += w + spacing;
  }
  return lx;
}

/** 날짜 → 그럴싸한 문서번호 "제2026-073호" (연중 일수 기반) */
function issueNo(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const start = Date.UTC(y, 0, 0);
  const cur = Date.UTC(y, m - 1, d);
  const doy = Math.round((cur - start) / 86400000);
  return `제${y}-${String(doy).padStart(3, "0")}호`;
}

/** 상단 중앙 국장(國章) 느낌의 무궁화 로제트 엠블럼 */
function drawEmblem(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number
): void {
  ctx.save();
  // 무궁화 느낌의 8꽃잎
  ctx.fillStyle = GOLD;
  const petals = 8;
  for (let i = 0; i < petals; i++) {
    const a = (Math.PI * 2 * i) / petals;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * R * 0.6, cy + Math.sin(a) * R * 0.6);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 0.44, R * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // 중앙 붉은 원 + 금테
  ctx.fillStyle = SEAL_RED;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.52, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.52, 0, Math.PI * 2);
  ctx.stroke();
  // 중앙 글자 休
  ctx.fillStyle = "#fff";
  ctx.font = `700 ${Math.round(R * 0.5)}px ${SERIF}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("休", cx, cy + 2);
  ctx.restore();
}

/** 상단 우측 결재란(공문 특유의 서명 박스) */
function drawApprovalBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
): void {
  const rowH = 44;
  const signH = 66;
  const c0 = 52; // "결재" 세로 칸 폭
  const cw = 96; // 담당/위원장 칸 폭
  const w = c0 + cw * 2;
  const h = rowH + signH;
  ctx.save();
  ctx.strokeStyle = SUBINK;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(x, y, w, h);
  // 세로선
  ctx.beginPath();
  ctx.moveTo(x + c0, y);
  ctx.lineTo(x + c0, y + h);
  ctx.moveTo(x + c0 + cw, y);
  ctx.lineTo(x + c0 + cw, y + h);
  // 가로선(담당/위원장 라벨과 서명칸 구분)
  ctx.moveTo(x + c0, y + rowH);
  ctx.lineTo(x + w, y + rowH);
  ctx.stroke();
  ctx.textBaseline = "middle";
  // "결 재" 세로 배치
  ctx.fillStyle = SUBINK;
  ctx.font = `700 22px ${SANS}`;
  ctx.textAlign = "center";
  ctx.fillText("결", x + c0 / 2, y + h / 2 - 15);
  ctx.fillText("재", x + c0 / 2, y + h / 2 + 15);
  // 라벨
  ctx.font = `600 22px ${SANS}`;
  ctx.fillText("담당", x + c0 + cw / 2, y + rowH / 2);
  ctx.fillText("위원장", x + c0 + cw + cw / 2, y + rowH / 2);
  // 서명칸 붉은 결재 도장(작은 원)
  ctx.strokeStyle = SEAL_RED;
  ctx.lineWidth = 2;
  for (const col of [x + c0 + cw / 2, x + c0 + cw + cw / 2]) {
    ctx.beginPath();
    ctx.arc(col, y + rowH + signH / 2, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = SEAL_RED;
    ctx.font = `700 20px ${SERIF}`;
    ctx.fillText("印", col, y + rowH + signH / 2 + 1);
  }
  ctx.restore();
}

/** 우하단 관인(官印) — 둥근 붉은 도장 "公休委印" */
function drawSeal(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-9 * Math.PI) / 180);
  ctx.strokeStyle = SEAL_RED;
  ctx.fillStyle = SEAL_RED;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, R - 13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = `700 ${Math.round(R * 0.62)}px ${SERIF}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const off = R * 0.42;
  const chars = ["公", "休", "委", "印"];
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
  const LM = 128; // 본문 좌측 여백
  const RM = W - 128; // 본문 우측 경계
  const contentW = RM - LM;
  const name = data.name.trim() || "○○○의 날";
  const reason = data.reason.trim() || "지친 마음의 긴급 구조가 필요하므로";
  const holder = data.holder.trim() || "본인";
  const dateText = formatKoreanDate(data.date);
  const [yy] = data.date.split("-");

  // ── 배경 (아주 옅은 미색 종이) ──────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#fcfbf7");
  bg.addColorStop(1, "#f5f1e7");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ── 테두리 (먹선 + 금 헤어라인 이중) ────────────────────────────────────
  ctx.strokeStyle = RULE;
  ctx.lineWidth = 3;
  ctx.strokeRect(50, 50, W - 100, H - 100);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(64, 64, W - 128, H - 128);

  ctx.textBaseline = "middle";

  // ── 상단 메타: 문서번호/시행일자(좌) · 결재란(우) ───────────────────────
  ctx.fillStyle = SUBINK;
  ctx.font = `600 30px ${SANS}`;
  ctx.textAlign = "left";
  ctx.fillText(`문서번호   ${issueNo(data.date)}`, LM, 150);
  ctx.fillText(`시 행 일   ${dateText}`, LM, 196);
  drawApprovalBox(ctx, RM - 244, 120);

  // ── 발행기관 엠블럼 + 명의 ──────────────────────────────────────────────
  drawEmblem(ctx, cx, 348, 78);
  ctx.fillStyle = INK;
  ctx.font = `800 52px ${SERIF}`;
  ctx.textAlign = "center";
  centeredSpaced(ctx, "나만의 공휴일 위원회", cx, 480, 6);

  // ── 굵은 구분선 ─────────────────────────────────────────────────────────
  ctx.strokeStyle = RULE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(LM, 528);
  ctx.lineTo(RM, 528);
  ctx.stroke();

  // ── 수신 / 제목 필드 ────────────────────────────────────────────────────
  const fieldX = LM;
  const valueX = LM + 132;
  ctx.textBaseline = "middle";
  ctx.fillStyle = SUBINK;
  ctx.font = `700 34px ${SANS}`;
  spacedLabel(ctx, "수신", fieldX, 592, 14);
  ctx.fillStyle = INK;
  ctx.font = `500 38px ${SERIF}`;
  ctx.textAlign = "left";
  ctx.fillText(`「${holder}」 귀하`, valueX, 592);

  ctx.fillStyle = SUBINK;
  ctx.font = `700 34px ${SANS}`;
  spacedLabel(ctx, "제목", fieldX, 652, 14);
  ctx.fillStyle = INK;
  ctx.font = `500 38px ${SERIF}`;
  ctx.textAlign = "left";
  ctx.fillText("개인 법정 공휴일 지정 및 선포", valueX, 652);

  // 가는 구분선
  ctx.strokeStyle = HAIR;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(LM, 700);
  ctx.lineTo(RM, 700);
  ctx.stroke();

  // ── 문서 제목(대) ───────────────────────────────────────────────────────
  ctx.fillStyle = INK;
  ctx.font = `800 100px ${SERIF}`;
  ctx.textAlign = "center";
  centeredSpaced(ctx, "공 휴 일  선 포 문", cx, 812, 4);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(cx - 300, 876);
  ctx.lineTo(cx + 300, 876);
  ctx.stroke();

  // ── 본문(번호 항목) ─────────────────────────────────────────────────────
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const bodyPx = 39;
  const bodyLh = bodyPx + 21;
  const indent = 42; // 번호 항목 이어지는 줄 들여쓰기
  let y = 966;

  const drawClause = (text: string) => {
    ctx.fillStyle = INK;
    ctx.font = `400 ${bodyPx}px ${SERIF}`;
    const lines = wrapText(ctx, text, contentW - indent);
    lines.forEach((ln, i) => {
      ctx.fillText(ln, LM + (i === 0 ? 0 : indent), y);
      y += bodyLh;
    });
  };

  drawClause("1. 귀하의 그동안의 노고에 깊은 경의를 표합니다.");
  y += 6;
  drawClause(
    `2. 이에 「${holder}」을(를) 아래와 같이 개인 법정 공휴일로 지정하고, 그 효력을 이에 엄숙히 선포합니다.`
  );

  // 가·나·다 세부 항목
  y += 16;
  const subLabelX = LM + 52;
  const subValueX = LM + 240;
  const subValueW = RM - subValueX;

  // 가. 지정일 (붉은 강조)
  ctx.fillStyle = SUBINK;
  ctx.font = `600 36px ${SANS}`;
  ctx.fillText("가.  지 정 일", subLabelX, y);
  ctx.fillStyle = SEAL_RED;
  ctx.font = `700 46px ${SERIF}`;
  ctx.fillText(dateText, subValueX, y);
  y += 70;

  // 나. 명칭 (하이라이트 박스)
  ctx.fillStyle = SUBINK;
  ctx.font = `600 36px ${SANS}`;
  ctx.fillText("나.  명    칭", subLabelX, y);
  const nameFit = fitLines(ctx, `「${name}」`, subValueW, 46, 800, SERIF, 1, 30);
  const nameLabel = nameFit.lines[0] ?? `「${name}」`;
  ctx.font = `800 ${nameFit.px}px ${SERIF}`;
  const nw = ctx.measureText(nameLabel).width;
  ctx.fillStyle = "rgba(176,134,47,0.16)";
  ctx.fillRect(subValueX - 12, y - nameFit.px * 0.72, nw + 24, nameFit.px * 1.44);
  ctx.fillStyle = "#8a5a12";
  ctx.fillText(nameLabel, subValueX, y);
  y += 70;

  // 다. 사유 (필요 시 2줄 줄바꿈)
  ctx.fillStyle = SUBINK;
  ctx.font = `600 36px ${SANS}`;
  ctx.fillText("다.  선포사유", subLabelX, y);
  const reasonFit = fitLines(ctx, `“${reason}”`, subValueW, 38, 400, SERIF, 2, 26);
  ctx.font = `400 ${reasonFit.px}px ${SERIF}`;
  ctx.fillStyle = "#3a3f4c";
  const rLh = reasonFit.px + 10;
  reasonFit.lines.forEach((ln, i) => {
    ctx.fillText(ln, subValueX, y + i * rLh);
  });
  y += (reasonFit.lines.length - 1) * rLh + 66;

  // 3. 효력 확인
  drawClause(
    "3. 상기인은 지정일 당일, 일체의 업무 연락 및 사회적 책무로부터 합법적으로 면제됨을 확인합니다.  끝."
  );

  // ── 하단: 굵은 선 · 발신명의 · 관인 · 워터마크 ──────────────────────────
  // 실제 공문처럼 발신 명의를 하단에 고정 배치한다. 본문은 위에서 넉넉히
  // 압축돼 항상 이 위치 위에서 끝나므로 겹치지 않는다. (초장문일 때만 아래로 흐름)
  const sepY = Math.max(1668, y + 20);
  ctx.strokeStyle = RULE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(LM, sepY);
  ctx.lineTo(RM, sepY);
  ctx.stroke();

  // 발신 명의 — 관인과 겹치지 않도록 폰트를 줄이고 왼쪽으로 살짝 이동
  const signY = sepY + 76;
  ctx.fillStyle = INK;
  ctx.font = `700 40px ${SERIF}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  centeredSpaced(ctx, `${yy}년  나만의 공휴일 위원회 위원장`, cx - 78, signY, 1);
  drawSeal(ctx, RM - 56, signY, 50);

  // 워터마크 (바이럴 루프: 이미지를 본 사람이 사이트를 찾도록)
  const wm = data.site
    ? `나도 만들기 · ${data.site}`
    : "나도 만들기 · 나만의 공휴일";
  const wmY = signY + 68;
  ctx.fillStyle = SUBINK;
  ctx.font = `600 24px ${SANS}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  centeredSpaced(ctx, wm, cx, wmY, 2);
}
