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
        <div className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-6">
          <header className="mb-8 flex items-baseline justify-between gap-4">
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

          <footer className="mt-16 border-t pt-6 text-xs leading-relaxed text-[var(--text-muted)]"
            style={{ borderColor: 'var(--border)' }}>
            <p>
              만세력은 천문 계산(태양 겉보기 황경)과 IANA 표준시 데이터베이스를 근거로 산출하며,
              LLM을 쓰지 않으므로 같은 입력에 항상 같은 결과가 나옵니다.
            </p>
            <p className="mt-1.5">
              사주풀이 텍스트는 Gemini가 생성한 전통 명리학 해석입니다. 재미와 참고를 위한 것이며
              의료·법률·투자 판단의 근거로 삼지 마세요.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
