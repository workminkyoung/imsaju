import Link from 'next/link';

/**
 * 메인 화면. 기능이 둘로 갈리므로 먼저 어디로 갈지 고르게 한다.
 * 서버 컴포넌트로 두어 첫 화면이 자바스크립트 없이도 바로 뜨게 한다.
 */

const ENTRIES = [
  {
    href: '/saju',
    ganji: '命',
    title: '내 사주보기',
    description: '생년월일시로 만세력을 세우고 원국·대운·세운을 봅니다.',
    points: ['원국 4주와 지장간·십신·12운성', '오행 분포와 신강·신약', '대운 10주기 · 세운 10년'],
  },
  {
    href: '/compatibility',
    ganji: '合',
    title: '궁합보기',
    description: '두 사람의 사주를 맞대어 직장에서의 결을 봅니다.',
    points: ['사람 카드를 저장해 두고 골라 쓰기', '상사·동료·선임 관계별 해석', '합·충·형·해를 항목별로 공개'],
  },
];

export default function Home() {
  return (
    <main className="space-y-6">
      <section className="text-center">
        <h2 className="text-lg font-semibold">무엇을 보시겠어요?</h2>
        <p className="mt-1.5 text-sm text-[var(--text-muted)]">
          만세력과 궁합은 천문 계산으로 산출합니다. AI는 풀이를 쓸 때만 씁니다.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {ENTRIES.map((entry) => (
          <Link
            key={entry.href}
            href={entry.href}
            className="card group flex flex-col transition hover:-translate-y-0.5"
            style={{ borderColor: 'var(--border)' }}
          >
            <span
              className="ganji text-4xl leading-none transition group-hover:scale-110"
              style={{ color: 'var(--accent)' }}
            >
              {entry.ganji}
            </span>
            <h3 className="mt-3 text-base font-semibold">{entry.title}</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{entry.description}</p>

            <ul className="mt-4 space-y-1 text-xs text-[var(--text-muted)]">
              {entry.points.map((point) => (
                <li key={point}>· {point}</li>
              ))}
            </ul>

            <span
              className="mt-5 inline-block text-sm font-medium transition group-hover:translate-x-0.5"
              style={{ color: 'var(--accent)' }}
            >
              시작하기 →
            </span>
          </Link>
        ))}
      </div>

      <section className="card" style={{ background: 'var(--surface-sunken)' }}>
        <h2 className="text-sm font-semibold">계산 방식</h2>
        <ul className="mt-2 space-y-1 text-xs leading-relaxed text-[var(--text-muted)]">
          <li>· 절기를 근사표가 아니라 태양 겉보기 황경으로 직접 계산합니다.</li>
          <li>· 1908년 지방시부터 1954·1961년 표준시 변경, 1948~1988년 서머타임까지 자동 반영합니다.</li>
          <li>· 출생지 경도로 진태양시를 보정합니다 (서울 기준 −32분).</li>
          <li>· 어떤 값이 어떻게 적용됐는지 「계산 근거」에서 전부 공개합니다.</li>
        </ul>
      </section>
    </main>
  );
}
