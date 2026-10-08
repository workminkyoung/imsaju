import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'IMSaju — 만세력 · 사주풀이',
  description:
    '천문 계산으로 절기를 직접 구하고, 한국 표준시 이력과 진태양시를 반영한 만세력. 계산 근거를 함께 공개합니다.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {/*
          바깥 틀은 높이만 잡고 폭은 쥐지 않는다. 메인 카드 테이블이 화면 좌우 끝과
          아래 끝까지 이어져야 해서, 가운데 폭은 각 페이지가 .page-shell 로 정한다.
        */}
        <div className="flex min-h-screen flex-col">
          <header className="page-shell mb-8 flex items-baseline justify-between gap-4 pt-8">
            <Link href="/" className="group">
              <h1 className="ganji text-2xl font-bold tracking-tight">萬歲曆</h1>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                만세력과 사주풀이
              </p>
            </Link>
            <Link
              href="/admin"
              className="text-xs text-[var(--text-muted)] transition hover:text-[var(--accent)]"
            >
              관리자
            </Link>
          </header>

          {children}
        </div>
      </body>
    </html>
  );
}
