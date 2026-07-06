// ============================================================================
// 나만의 공휴일 — 인쇄용 월간 달력 생성 (A4 세로 비율, <canvas> 직접 렌더)
// ----------------------------------------------------------------------------
// 공휴일·대체공휴일(빨강), 토요일(파랑), 생일(🎂 금테), 나만의 공휴일(⭐ 골드+크림슨
// 이중 테두리)을 한 장에 담아 저장/인쇄할 수 있게 한다. 흰 배경이라 프린트 잉크 절약.
// ============================================================================

import {
  HOLIDAYS_BY_YEAR,
  SEASON_START,
  SupportedYear,
  WEEKDAY_LABELS,
  daysInMonth,
  getWeekday,
  toDateString,
  type Holiday,
} from "./holidays";

// A4 세로 @ ~150dpi (1:√2 비율) — 인쇄 시 A4 한 페이지에 꽉 참
export const CAL_W = 1240;
export const CAL_H = 1754;

const SANS =
  "'Malgun Gothic', 'Apple SD Gothic Neo', 'Nanum Gothic', sans-serif";

// 인쇄 친화 팔레트
const INK = "#20242e";
const SUBINK = "#9aa0ab";
const GRID = "#e7e2d8";
const RED = "#e5162f"; // 공휴일·일요일
const BLUE = "#1b62d6"; // 토요일
const GOLD = "#b9821a"; // 생일 텍스트(딥 골드)
const GOLD_LINE = "#e8a53a"; // 금테
const CRIMSON = "#f6042e"; // 나만의 공휴일 강조

const MONTH_EN = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

export interface MyHoliday {
  /** "YYYY-MM-DD" */
  date: string;
  /** 공휴일 명칭 */
  name: string;
}

export interface MonthCalendarData {
  year: SupportedYear;
  month: number; // 1~12
  /** "MM-DD" 생일 키 (선택) */
  birthdayKey?: string;
  /** 사용자가 만든 나만의 공휴일 (선택) */
  myHoliday?: MyHoliday;
  /** 하단 워터마크용 사이트 주소 */
  site?: string;
}

/** 해당 연도에 인쇄 가능한 달 목록 (2026: 8~12 / 2027: 1~12) */
export function getPrintableMonths(year: SupportedYear): number[] {
  const start = Number(SEASON_START[year].split("-")[1]);
  const months: number[] = [];
  for (let m = start; m <= 12; m++) months.push(m);
  return months;
}

// ── 그리기 헬퍼 ──────────────────────────────────────────────────────────────

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

/** 글자 단위 줄바꿈 후 maxLines로 자르고, 넘치면 말줄임 */
function wrapCap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const ch of [...text]) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
      if (lines.length === maxLines) break;
    } else {
      line = test;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  // 마지막 줄이 잘렸으면 말줄임 표시
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    const consumed = lines.join("").length;
    if (consumed < [...text].length) {
      while (last && ctx.measureText(last + "…").width > maxWidth) {
        last = last.slice(0, -1);
      }
      lines[maxLines - 1] = last + "…";
    }
  }
  return lines;
}

interface CellMeta {
  label?: string; // 셀에 표시할 명칭(공휴일/생일/나만의)
  numColor: string;
  kind: "normal" | "holiday" | "birthday" | "my";
  badge?: string; // 이모지 배지
}

/** 하루의 표시 메타 결정 (우선순위: 나만의 > 생일 > 공휴일 > 요일색) */
function classifyForPrint(
  dateStr: string,
  weekday: number,
  holidayMap: Map<string, Holiday>,
  birthdayKey?: string,
  myHoliday?: MyHoliday
): CellMeta {
  if (myHoliday && dateStr === myHoliday.date) {
    return {
      kind: "my",
      label: myHoliday.name.trim() || "나만의 공휴일",
      numColor: CRIMSON,
      badge: "⭐",
    };
  }
  const mmdd = dateStr.slice(5);
  const holiday = holidayMap.get(dateStr);
  if (birthdayKey && mmdd === birthdayKey) {
    return {
      kind: "birthday",
      label: holiday ? `생일 · ${holiday.name}` : "생일",
      numColor: GOLD,
      badge: "🎂",
    };
  }
  if (holiday) {
    return { kind: "holiday", label: holiday.name, numColor: RED };
  }
  if (weekday === 0) return { kind: "normal", numColor: RED };
  if (weekday === 6) return { kind: "normal", numColor: BLUE };
  return { kind: "normal", numColor: INK };
}

/** 한 달치 달력을 캔버스에 렌더 (미리보기 = 저장 이미지) */
export function drawMonthCalendar(
  ctx: CanvasRenderingContext2D,
  data: MonthCalendarData
): void {
  const { year, month, birthdayKey, myHoliday, site } = data;
  const W = CAL_W;
  const H = CAL_H;
  const holidayMap = new Map(
    HOLIDAYS_BY_YEAR[year].map((h) => [h.date, h])
  );

  // ── 배경 ──
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  const marginX = 56;
  const gridW = W - marginX * 2;
  const cellW = gridW / 7;

  // ── 타이틀 ──
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  ctx.font = `800 78px ${SANS}`;
  ctx.fillText(`${month}월`, marginX, 132);

  ctx.textAlign = "right";
  ctx.fillStyle = GOLD;
  ctx.font = `700 34px ${SANS}`;
  ctx.fillText(`${year} · ${MONTH_EN[month - 1]}`, W - marginX, 108);
  ctx.fillStyle = SUBINK;
  ctx.font = `600 24px ${SANS}`;
  ctx.fillText("나만의 공휴일 달력", W - marginX, 140);

  // 금색 구분선
  ctx.strokeStyle = GOLD_LINE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(marginX, 172);
  ctx.lineTo(W - marginX, 172);
  ctx.stroke();

  // ── 요일 헤더 ──
  const headY = 210;
  const headH = 62;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 30px ${SANS}`;
  for (let c = 0; c < 7; c++) {
    ctx.fillStyle = c === 0 ? RED : c === 6 ? BLUE : SUBINK;
    ctx.fillText(
      WEEKDAY_LABELS[c],
      marginX + c * cellW + cellW / 2,
      headY + headH / 2
    );
  }

  // ── 그리드 ──
  const gy = headY + headH + 10; // 그리드 시작 y
  const gBottom = H - 150; // 하단 범례 영역 확보
  const rows = 6;
  const cellH = (gBottom - gy) / rows;

  const total = daysInMonth(year, month);
  const leading = getWeekday(toDateString(year, month, 1));

  // 그리드 배경 격자
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1.5;
  for (let r = 0; r <= rows; r++) {
    const y = gy + r * cellH;
    ctx.beginPath();
    ctx.moveTo(marginX, y);
    ctx.lineTo(W - marginX, y);
    ctx.stroke();
  }
  for (let c = 0; c <= 7; c++) {
    const x = marginX + c * cellW;
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x, gy + rows * cellH);
    ctx.stroke();
  }

  // 날짜 셀
  for (let d = 1; d <= total; d++) {
    const idx = leading + d - 1;
    const col = idx % 7;
    const row = Math.floor(idx / 7);
    if (row >= rows) break;
    const x = marginX + col * cellW;
    const y = gy + row * cellH;
    const dateStr = toDateString(year, month, d);
    const weekday = getWeekday(dateStr);
    const meta = classifyForPrint(
      dateStr,
      weekday,
      holidayMap,
      birthdayKey,
      myHoliday
    );

    // 특별 셀 배경 + 테두리
    if (meta.kind === "my") {
      ctx.fillStyle = "rgba(246,4,46,0.06)";
      roundRect(ctx, x + 4, y + 4, cellW - 8, cellH - 8, 16);
      ctx.fill();
      // 골드 외곽 + 크림슨 내곽 이중 테두리
      ctx.strokeStyle = GOLD_LINE;
      ctx.lineWidth = 6;
      roundRect(ctx, x + 5, y + 5, cellW - 10, cellH - 10, 15);
      ctx.stroke();
      ctx.strokeStyle = CRIMSON;
      ctx.lineWidth = 2.5;
      roundRect(ctx, x + 13, y + 13, cellW - 26, cellH - 26, 10);
      ctx.stroke();
    } else if (meta.kind === "birthday") {
      ctx.fillStyle = "rgba(255,190,60,0.14)";
      roundRect(ctx, x + 4, y + 4, cellW - 8, cellH - 8, 16);
      ctx.fill();
      ctx.strokeStyle = GOLD_LINE;
      ctx.lineWidth = 4.5;
      roundRect(ctx, x + 6, y + 6, cellW - 12, cellH - 12, 14);
      ctx.stroke();
    }

    // 날짜 숫자
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = meta.numColor;
    ctx.font = `${meta.kind === "my" ? 800 : 700} 34px ${SANS}`;
    ctx.fillText(String(d), x + 16, y + 14);

    // 배지 (⭐ / 🎂)
    if (meta.badge) {
      ctx.textAlign = "right";
      ctx.font = `400 30px ${SANS}`;
      ctx.fillText(meta.badge, x + cellW - 12, y + 14);
    }

    // 명칭 라벨
    if (meta.label) {
      const isMy = meta.kind === "my";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillStyle =
        meta.kind === "my" ? CRIMSON : meta.kind === "birthday" ? GOLD : RED;
      const px = isMy ? 21 : 19;
      ctx.font = `${isMy ? 700 : 600} ${px}px ${SANS}`;
      const lines = wrapCap(ctx, meta.label, cellW - 30, isMy ? 3 : 2);
      let ly = y + 58;
      const lh = px + 7;
      for (const ln of lines) {
        ctx.fillText(ln, x + 15, ly);
        ly += lh;
      }
    }
  }

  // ── 하단 범례 + 워터마크 ──
  const legendY = gBottom + 54;
  ctx.textBaseline = "middle";
  ctx.font = `600 24px ${SANS}`;

  let lx = marginX;
  const gap = 22;
  const items: { badge: string; text: string; color: string }[] = [
    { badge: "⭐", text: "나만의 공휴일", color: CRIMSON },
    { badge: "🎂", text: "생일", color: GOLD },
    { badge: "●", text: "공휴일·대체공휴일", color: RED },
    { badge: "●", text: "토요일", color: BLUE },
  ];
  ctx.textAlign = "left";
  for (const it of items) {
    ctx.fillStyle = it.color;
    ctx.font = `400 24px ${SANS}`;
    ctx.fillText(it.badge, lx, legendY);
    const bw = ctx.measureText(it.badge).width;
    ctx.fillStyle = "#5a606c";
    ctx.font = `600 24px ${SANS}`;
    ctx.fillText(it.text, lx + bw + 8, legendY);
    lx += bw + 8 + ctx.measureText(it.text).width + gap + 14;
  }

  // 워터마크 (우측 하단)
  ctx.textAlign = "right";
  ctx.fillStyle = INK;
  ctx.font = `800 26px ${SANS}`;
  const wmY = H - 54;
  ctx.fillText("🏖️ 나만의 공휴일", W - marginX, wmY - 15);
  ctx.fillStyle = SUBINK;
  ctx.font = `600 20px ${SANS}`;
  ctx.fillText(site ? `나도 만들기 · ${site}` : "나도 만들기", W - marginX, wmY + 15);
}
