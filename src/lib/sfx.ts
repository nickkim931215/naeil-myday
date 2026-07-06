// ============================================================================
// 효과음(SFX) — Web Audio API로 "실시간 합성". 오디오 파일 번들 없음.
// ----------------------------------------------------------------------------
// - 오디오 파일이 없으니 로딩·용량 부담 0, 오프라인에서도 동작.
// - 클릭음은 펜타토닉 음계에서 랜덤으로 골라 마림바처럼 '음악적'으로 들린다
//   (같은 소리 반복이 아니라 눌러도 눌러도 살짝살짝 달라지는 센스).
// - 브라우저 자동재생 정책상 AudioContext는 '사용자 제스처' 안에서 resume돼야
//   하므로, 실제 play는 pointerdown/click 핸들러에서 호출한다.
// ============================================================================

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

const MUTE_KEY = "nemal:muted";

/** localStorage에 저장된 음소거 설정을 불러온다 (SSR 안전) */
export function loadMutePref(): boolean {
  if (typeof window === "undefined") return false;
  muted = window.localStorage.getItem(MUTE_KEY) === "1";
  return muted;
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  }
}

/** AudioContext를 (필요 시 생성 후) 반환하고, suspended면 resume한다. */
function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

interface NoteOpts {
  type?: OscillatorType;
  dur?: number; // 길이(초)
  vol?: number; // 피크 게인
  delay?: number; // 시작 지연(초)
  bendTo?: number; // 끝날 때 도달할 주파수(피치 벤딩)
}

/** 짧은 한 음을 합성해 재생 (attack→decay 엔벨로프) */
function note(freq: number, opts: NoteOpts = {}): void {
  const c = audio();
  if (!c || !master || muted) return;
  const { type = "sine", dur = 0.14, vol = 0.16, delay = 0, bendTo } = opts;
  const t = c.currentTime + delay;

  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (bendTo) osc.frequency.exponentialRampToValueAtTime(bendTo, t + dur);

  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008); // 빠른 어택
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur); // 부드러운 감쇠

  osc.connect(g);
  g.connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.03);
}

// C 메이저 펜타토닉 (C5~C6) — 아무렇게나 눌러도 불협 없이 예쁘게 들리는 음계
const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
let lastIdx = -1;

function nextPentatonic(): number {
  let i = Math.floor(Math.random() * PENTATONIC.length);
  if (i === lastIdx) i = (i + 1) % PENTATONIC.length; // 직전 음과 겹치지 않게
  lastIdx = i;
  return PENTATONIC[i];
}

export type SfxKind =
  | "pop" // 일반 버튼/링크 클릭 — 마림바 톡
  | "select" // 탭·칩·날짜 선택 — 뿅(버블) 업벤딩
  | "sparkle" // 성공·주요 CTA — 상승 아르페지오 + 샤르르
  | "dice" // 랜덤/룰렛 — 드르륵 굴러가는 소리
  | "error" // 비활성 클릭 — 낮은 부저(삐-)
  | "tick"; // 배경(빈 곳) 클릭 — 아주 작은 틱

/** 종류에 맞는 효과음을 재생 */
export function sfx(kind: SfxKind): void {
  switch (kind) {
    case "pop": {
      const f = nextPentatonic();
      note(f, { type: "sine", dur: 0.16, vol: 0.16 });
      note(f * 2, { type: "triangle", dur: 0.09, vol: 0.045 }); // 옥타브 하모닉
      break;
    }
    case "select":
      note(660, { type: "sine", dur: 0.12, vol: 0.16, bendTo: 990 });
      break;
    case "sparkle": {
      // E5 · G#5 · B5 · E6 상승 + 꼭대기 샤르르
      [659.25, 830.61, 987.77, 1318.5].forEach((f, i) =>
        note(f, { type: "triangle", dur: 0.22, vol: 0.14, delay: i * 0.06 })
      );
      note(1975.5, { type: "sine", dur: 0.4, vol: 0.05, delay: 0.2 });
      break;
    }
    case "dice":
      // 드르륵 — 빠른 하강 블립들 뒤에 안착하는 뿅
      [880, 740, 620, 520].forEach((f, i) =>
        note(f, { type: "square", dur: 0.05, vol: 0.06, delay: i * 0.05 })
      );
      note(620, { type: "sine", dur: 0.18, vol: 0.15, delay: 0.24, bendTo: 950 });
      break;
    case "error":
      note(160, { type: "square", dur: 0.16, vol: 0.12, bendTo: 110 });
      note(150, { type: "square", dur: 0.2, vol: 0.09, delay: 0.06, bendTo: 100 });
      break;
    case "tick":
      note(1200, { type: "sine", dur: 0.04, vol: 0.035 });
      break;
  }
}
