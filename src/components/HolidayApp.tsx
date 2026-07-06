"use client";

import { useState } from "react";
import BirthdayForm, { BirthdaySetup } from "./BirthdayForm";
import HolidayCalendar, { rejectMessage } from "./HolidayCalendar";
import ProclamationCard from "./ProclamationCard";
import OutOfOfficeCard from "./OutOfOfficeCard";
import CalendarDownload from "./CalendarDownload";
import Toast from "./Toast";
import {
  DayInfo,
  formatKoreanDate,
  pickRandomWeekday,
  toBirthdayKey,
} from "@/lib/holidays";
import { sfx } from "@/lib/sfx";

type Step = "setup" | "pick" | "proclaim";
type Tab = "proclaim" | "ooo" | "cal";

export default function HolidayApp() {
  const [step, setStep] = useState<Step>("setup");
  const [setup, setSetup] = useState<BirthdaySetup | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  // 최종 단계 상태 (선포문/부재중 탭이 공유)
  const [tab, setTab] = useState<Tab>("proclaim");
  const [name, setName] = useState("");

  const birthdayKey = setup ? toBirthdayKey(setup.month, setup.day) : "";

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 2800);
  };

  const handleSetup = (s: BirthdaySetup) => {
    setSetup(s);
    setStep("pick");
  };

  const handleSelect = (date: string) => {
    setSelected(date);
    setStep("proclaim");
  };

  const handleReject = (info: DayInfo) => showToast(rejectMessage(info));

  const handleRoulette = () => {
    if (!setup || spinning) return;
    setSpinning(true);
    // 룰렛이 도는 척 잠깐의 긴장감
    window.setTimeout(() => {
      const d = pickRandomWeekday(setup.year, birthdayKey);
      setSpinning(false);
      if (d) {
        sfx("sparkle"); // 당첨! 축포음
        setSelected(d);
        setStep("proclaim");
      } else {
        sfx("error");
        showToast("어라, 뽑을 평일이 없네요. 다른 해로 바꿔볼까요?");
      }
    }, 750);
  };

  const restart = () => {
    setStep("setup");
    setSelected(null);
    setTab("proclaim");
    setName("");
  };

  return (
    <main className="relative flex min-h-full w-full flex-1 flex-col items-center overflow-x-hidden px-4 py-10 sm:py-12">
      {/* 헤더 */}
      <header className="mb-7 flex w-full max-w-xl flex-col items-center px-1 text-center">
        <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-gold/25 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-gold shadow-sm">
          🏖️ 나만의 공휴일
        </span>
        <h1 className="w-full text-balance text-xl font-black leading-snug tracking-tight text-ivory sm:text-2xl md:text-3xl">
          예수님, 부처님도 하루씩 쉬시는데, 저는요?
        </h1>
        <p className="mt-3 w-full text-balance bg-gradient-to-r from-gold to-crimson bg-clip-text pb-1 text-lg font-black leading-tight text-transparent sm:text-xl md:text-2xl">
          대체공휴일 말고, 나만의 대체공휴(생)일!
        </p>
      </header>

      {/* 단계 표시 */}
      <StepDots step={step} />

      {/* 본문 */}
      <section className="mt-8 flex w-full flex-col items-center">
        {step === "setup" && <BirthdayForm onSubmit={handleSetup} />}

        {step === "pick" && setup && (
          <div className="flex w-full flex-col items-center gap-5">
            {setup.year === 2026 && (
              <p className="rounded-full bg-gold/10 px-4 py-2 text-center text-xs font-medium text-gold">
                📢 2026년은 <b>8월 ~ 12월</b> 중에서 고를 수 있어요 (지난 날짜는 제외)
              </p>
            )}
            <HolidayCalendar
              year={setup.year}
              birthdayKey={birthdayKey}
              selected={selected}
              onSelect={handleSelect}
              onReject={handleReject}
            />
            <div className="flex items-center gap-3 text-sm text-muted">
              <span className="h-px w-8 bg-white/15" />
              고르기 어렵다면
              <span className="h-px w-8 bg-white/15" />
            </div>
            <button
              type="button"
              onClick={handleRoulette}
              disabled={spinning}
              data-sfx="dice"
              className="flex items-center gap-2 rounded-2xl bg-gold px-6 py-3.5 text-base font-bold text-ink shadow-lg shadow-gold/20 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-70"
            >
              <span className={spinning ? "animate-spin-fast" : ""}>🎲</span>
              {spinning ? "운명을 뽑는 중…" : "운명에 맡기기 (랜덤 평일)"}
            </button>
            <button
              type="button"
              onClick={restart}
              className="text-sm font-medium text-muted transition hover:text-ivory"
            >
              ← 생일 다시 입력
            </button>
          </div>
        )}

        {step === "proclaim" && selected && (
          <div className="flex w-full flex-col items-center gap-6">
            {/* 결과물 탭 */}
            <div className="flex gap-1 rounded-full border border-white/10 bg-white/5 p-1.5 shadow-sm">
              {(
                [
                  { key: "proclaim", label: "📜 선포문" },
                  { key: "ooo", label: "💬 부재중 짤" },
                  { key: "cal", label: "📅 달력" },
                ] as { key: Tab; label: string }[]
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  data-sfx="select"
                  onClick={() => setTab(t.key)}
                  className={`rounded-full px-3.5 py-2 text-sm font-bold transition sm:px-5 ${
                    tab === t.key
                      ? "bg-gold text-ink shadow"
                      : "text-muted hover:text-ivory"
                  }`}
                  aria-pressed={tab === t.key}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "proclaim" && (
              <ProclamationCard
                date={selected}
                name={name}
                onNameChange={setName}
                onBack={() => setStep("pick")}
                onRestart={restart}
              />
            )}
            {tab === "ooo" && (
              <OutOfOfficeCard
                date={selected}
                name={name}
                onNameChange={setName}
                onBack={() => setStep("pick")}
                onRestart={restart}
              />
            )}
            {tab === "cal" && setup && (
              <CalendarDownload
                year={setup.year}
                birthdayKey={birthdayKey || undefined}
                myHoliday={{ date: selected, name }}
                onBack={() => setStep("pick")}
                onRestart={restart}
              />
            )}
          </div>
        )}
      </section>

      <Toast message={toast} />

      <footer className="mt-14 w-full max-w-md text-balance px-4 text-center text-xs leading-5 text-muted">
        {selected && step !== "proclaim" && (
          <span className="mr-2">선택: {formatKoreanDate(selected)} ·</span>
        )}
        생일은 가족이랑 보내기도 하잖아요? 하루쯤은, 정말 나를 위해 국가공휴일로 지정해요.
      </footer>
    </main>
  );
}

function StepDots({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "setup", label: "생일 입력" },
    { key: "pick", label: "날짜 선택" },
    { key: "proclaim", label: "선포문 발급" },
  ];
  const activeIdx = steps.findIndex((s) => s.key === step);
  return (
    <div className="flex max-w-full flex-wrap items-center justify-center gap-1 sm:gap-1.5">
      {steps.map((s, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        return (
          <div key={s.key} className="flex items-center gap-1 sm:gap-1.5">
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition sm:text-xs ${
                active
                  ? "bg-gold text-ink shadow-sm"
                  : done
                    ? "bg-gold/15 text-gold"
                    : "bg-white/5 text-muted"
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                  active
                    ? "bg-ink/15"
                    : done
                      ? "bg-gold/25"
                      : "bg-white/10"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <span className="h-px w-2.5 bg-white/10 sm:w-4" />
            )}
          </div>
        );
      })}
    </div>
  );
}
