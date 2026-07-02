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

export type ShareResult = "shared" | "canceled" | "downloaded";

/**
 * 캔버스 이미지를 공유한다. 클릭 핸들러에서 바로 호출할 것(제스처 유지).
 * - 지원 기기(모바일): 네이티브 공유 시트 → 인스타 등 선택
 * - 미지원(데스크톱/인앱 등): 이미지 저장으로 폴백
 */
export async function shareCanvas(
  canvas: HTMLCanvasElement,
  filename: string,
  meta: { title: string; text: string }
): Promise<ShareResult> {
  const file = canvasToPngFile(canvas, filename);
  const nav = navigator;
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: meta.title, text: meta.text });
      return "shared";
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return "canceled";
      // 그 외 오류 → 저장 폴백
    }
  }
  downloadCanvas(canvas, filename);
  return "downloaded";
}

/** 폴백(저장)됐을 때 사용자에게 보여줄 안내 문구 */
export function fallbackHint(savedTargetKo: string): string {
  return isInAppBrowser()
    ? `카톡·인스타 인앱 브라우저에선 공유가 막혀 있어요. 우측 상단 메뉴에서 '다른 브라우저(크롬·사파리)로 열기' 후 다시 눌러주세요! (이미지는 저장해뒀어요)`
    : `이 기기에선 바로 공유가 안 돼요. 이미지를 저장했으니 ${savedTargetKo}에 올려주세요!`;
}
