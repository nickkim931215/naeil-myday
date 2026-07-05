import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 배포 도메인이 잡히면 그걸, 아니면 Vercel 프리뷰 URL을 metadataBase로 사용
const siteBase =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

const TITLE = "나만의 공휴일 — 지루한 평일 하루를 나만의 공휴일로";
const DESCRIPTION =
  "예수님, 부처님도 하루씩 쉬시는데 저는요? 주말도 공휴일도 생일도 아닌 '순수 평일' 하루를 골라, 나만의 공휴일로 선포하고 선포문·부재중 짤을 만들어 공유하세요.";

export const metadata: Metadata = {
  ...(siteBase ? { metadataBase: new URL(siteBase) } : {}),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "나만의 공휴일",
  keywords: [
    "나만의 공휴일",
    "셀프 공휴일",
    "대체공휴일",
    "선포문",
    "부재중",
    "생일",
    "짤 생성기",
  ],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "나만의 공휴일",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
