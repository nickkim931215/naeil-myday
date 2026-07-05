// ============================================================================
// 이미지 공유 유틸 — 네이티브 공유 시트(모바일) 우선, 미지원 시 저장 폴백
// ----------------------------------------------------------------------------
// 핵심: navigator.share는 '사용자 제스처(클릭)' 컨텍스트 안에서 호출돼야 한다.
// canvas.toBlob(비동기) 콜백에서 부르면 iOS 등에서 제스처가 끊겨 실패하므로,
// toDataURL(동기)로 File을 만들어 클릭 핸들러 안에서 곧바로 공유한다.
// ============================================================================

/** 카톡/인스타/페북 등 인앱 브라우저 여부 (파일 공유가 막혀 있는 경우가 많음) */
export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /KAKAOTALK|Instagram|FBAN|FBAV|FB_IAB|Line\/|NAVER|DaumApps|Snapchat|Twitter|everytime|band/i.test(
    ua
  );
}

/** 동기적으로 캔버스를 PNG File로 변환 (제스처 유지에 유리) */
export function canvasToPngFile(
  canvas: HTMLCanvasElement,
  filename: string
): File {
  const dataURL = canvas.toDataURL("image/png");
  const b64 = dataURL.split(",")[1] ?? "";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], filename, { type: "image/png" });
}

/** 브라우저에서 이미지 저장(다운로드) */
export function downloadCanvas(
  canvas: HTMLCanvasElement,
  filename: string
): void {
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/** 공유가 저장으로 폴백된 이유 */
export type FallbackReason =
  | "in-app" // 카톡/인스타 인앱 브라우저 → 파일 공유 차단
  | "insecure" // HTTP(비보안 컨텍스트) → Web Share 자체가 비활성
  | "no-share-api" // navigator.share 자체가 없음 (대부분 데스크톱)
  | "no-file-share" // share는 있으나 파일 공유 미지원 (일부 브라우저)
  | "error"; // share 도중 예외

export type ShareOutcome =
  | { status: "shared" }
  | { status: "canceled" }
  | { status: "downloaded"; reason: FallbackReason; detail?: string };

/**
 * 캔버스 이미지를 공유한다. 클릭 핸들러에서 바로 호출할 것(제스처 유지).
 * - 지원 기기(모바일 HTTPS): 네이티브 공유 시트 → 카톡/인스타 등 선택
 * - 미지원(데스크톱/인앱/HTTP 등): 이미지 저장으로 폴백 + 이유 반환
 */
export async function shareCanvas(
  canvas: HTMLCanvasElement,
  filename: string,
  meta: { title: string; text: string; url?: string }
): Promise<ShareOutcome> {
  // canShare/share는 런타임에 없을 수 있어 옵셔널로 취급한다.
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
    share?: (data?: ShareData) => Promise<void>;
  };

  // 1) 보안 컨텍스트가 아니면(HTTP 등) Web Share 자체가 막혀 있다.
  if (typeof window !== "undefined" && window.isSecureContext === false) {
    downloadCanvas(canvas, filename);
    return { status: "downloaded", reason: "insecure" };
  }

  // 2) navigator.share 자체가 없으면(대개 데스크톱) 공유 불가.
  if (typeof nav.share !== "function") {
    downloadCanvas(canvas, filename);
    return { status: "downloaded", reason: "no-share-api" };
  }

  const file = canvasToPngFile(canvas, filename);

  // 3) 파일 공유 가능 여부. canShare가 없는 브라우저도 있어 '있을 때만' 신뢰한다.
  const fileShareOk =
    typeof nav.canShare === "function"
      ? nav.canShare({ files: [file] })
      : true; // canShare 미구현 → 일단 시도해본다(실패 시 catch로 폴백)

  if (!fileShareOk) {
    downloadCanvas(canvas, filename);
    return {
      status: "downloaded",
      reason: isInAppBrowser() ? "in-app" : "no-file-share",
    };
  }

  try {
    // url까지 함께 넘기면 카톡 등에서 이미지+링크가 같이 전달돼 바이럴에 유리하다.
    await nav.share({
      files: [file],
      title: meta.title,
      text: meta.text,
      ...(meta.url ? { url: meta.url } : {}),
    });
    return { status: "shared" };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError")
      return { status: "canceled" };
    downloadCanvas(canvas, filename);
    return {
      status: "downloaded",
      reason: isInAppBrowser() ? "in-app" : "error",
      detail: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
    };
  }
}

/** 현재 사이트 주소 (SSR 안전) — 공유 링크·워터마크 공용 소스 */
export function siteUrl(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

/** 이미지에 새길 워터마크용 호스트명 (예: "nemal.day", 로컬은 "localhost:3000") */
export function siteHost(): string {
  if (typeof window === "undefined") return "";
  return window.location.host;
}

/**
 * '사이트 링크' 자체를 퍼뜨리기 위한 공유. (친구 초대 = 바이럴 루프)
 * 네이티브 공유 시트 → 미지원 시 클립보드 복사로 폴백.
 */
export async function shareLink(meta: {
  title: string;
  text: string;
}): Promise<"shared" | "canceled" | "copied" | "failed"> {
  const url = siteUrl();
  const nav = navigator as Navigator & {
    share?: (data?: ShareData) => Promise<void>;
  };
  if (typeof nav.share === "function") {
    try {
      await nav.share({ title: meta.title, text: meta.text, url });
      return "shared";
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return "canceled";
      // 공유 실패 → 복사 폴백
    }
  }
  try {
    await navigator.clipboard.writeText(`${meta.text} ${url}`.trim());
    return "copied";
  } catch {
    return "failed";
  }
}

/** 폴백(저장)됐을 때 사용자에게 보여줄 안내 문구 */
export function fallbackHint(
  savedTargetKo: string,
  reason: FallbackReason
): string {
  switch (reason) {
    case "in-app":
      return "카톡·인스타 인앱 브라우저에선 공유가 막혀 있어요. 우측 상단 메뉴에서 '다른 브라우저(크롬·사파리)로 열기' 후 다시 눌러주세요! (이미지는 저장해뒀어요)";
    case "insecure":
      return "보안 연결(HTTPS)이 아니라 공유가 막혀 있어요. 배포된 https 주소로 열면 카톡·인스타로 바로 공유돼요. (이미지는 저장해뒀어요)";
    case "no-share-api":
      return `PC 브라우저에선 앱 공유가 안 돼요. 이미지를 저장했으니 폰에서 ${savedTargetKo}에 올려주세요!`;
    case "no-file-share":
      return `이 브라우저는 이미지 공유를 지원하지 않아요. 크롬·사파리로 열면 됩니다. (이미지는 저장했으니 ${savedTargetKo}에 올려주세요)`;
    case "error":
    default:
      return `공유 중 문제가 생겨 이미지를 저장했어요. ${savedTargetKo}에 올려주세요!`;
  }
}
