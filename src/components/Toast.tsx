"use client";

interface ToastProps {
  message: string | null;
}

/** 화면 하단 중앙에 뜨는 유쾌한 경고 토스트 */
export default function Toast({ message }: ToastProps) {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      // key로 메시지를 바꿔 매번 등장 애니메이션이 다시 재생되도록 함
      key={message}
      className="animate-toast-in fixed bottom-8 left-1/2 z-50 w-[min(90vw,420px)] -translate-x-1/2 rounded-2xl bg-slate-900 px-5 py-4 text-center text-sm font-semibold text-white shadow-2xl shadow-slate-900/30 dark:bg-white dark:text-slate-900"
    >
      {message}
    </div>
  );
}
