import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'IMSaju — 만세력 · 사주풀이',
  description:
    '천문 계산으로 절기를 직접 구하고, 한국 표준시 이력과 진태양시를 반영한 만세력과 사주풀이.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {/*
          바깥 틀은 높이만 잡고 폭은 쥐지 않는다. 메인 카드 테이블이 화면 좌우 끝과
          아래 끝까지 이어져야 해서, 가운데 폭은 각 페이지가 .page-shell 로 정한다.

          상단에 머리말 블록을 따로 두지 않는다. 배경(초록)이 화면 전체를 덮고 그 위에
          로고와 관리자 링크만 모서리에 얹힌다 — 띠·테두리·바탕이 없으므로 카드 테이블이
          위쪽까지 그대로 이어져 보인다.

          위 패딩은 **좁은 화면에서만** 둔다. 좁으면 가운데 정렬된 내용이 로고와 가로로
          겹치므로 비켜 줄 자리가 필요하지만, 넓은 화면에서는 로고가 왼쪽 끝에 비켜 서 있어
          겹치지 않는다. 그래서 PC 에서는 비우지 않고 카드 테이블이 화면 맨 위부터 전체
          높이를 쓰게 둔다 — 로고·관리자는 그 위에 얹힌다.

          넓은 화면에서도 자리가 필요한 글 페이지(사주·궁합·관리자)는 .page-top 으로
          각자 비운다. 여기서 한꺼번에 비우면 카드 테이블까지 밀려 내려간다.

          절대 위치는 패딩 박스를 기준으로 잡히므로, 패딩이 있든 없든 로고·관리자는
          모서리에 그대로 붙는다.
        */}
        <div className="relative flex min-h-screen flex-col pt-20 sm:pt-0">
          <Link href="/" className="absolute top-5 left-4 z-40 sm:left-6">
            <h1 className="text-2xl font-bold tracking-tight">IMSaju</h1>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">프로들의 궁합</p>
          </Link>

          <Link
            href="/admin"
            className="absolute top-7 right-4 z-40 text-xs text-[var(--text-muted)] transition hover:text-[var(--px-cream)] sm:right-6"
          >
            관리자
          </Link>

          {children}
        </div>
      </body>
    </html>
  );
}
