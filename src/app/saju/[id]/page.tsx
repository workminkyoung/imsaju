import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SajuView } from '@/components/SajuView';
import { getProfileStore } from '@/lib/profileStore';
import { computeSaju } from '@/lib/saju';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 카드 한 장의 사주 풀이.
 *
 * 서버 컴포넌트에서 카드를 꺼내 계산한다. 브라우저로 넘길 때는 생년월일이 담긴
 * `input` 과 `basis` 를 뺀다. 계산 근거는 본인 확인을 거쳐야 볼 수 있다.
 */
export default async function SajuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfileStore().get(id);
  if (!profile) notFound();

  const chart = computeSaju(profile.input);

  return (
    <main className="page-shell space-y-4 pb-12">
      <Link
        href="/"
        className="inline-block text-xs text-[var(--text-muted)] transition hover:text-[var(--px-cream)]"
      >
        ← 카드 테이블로
      </Link>

      <SajuView
        profileId={profile.id}
        name={profile.label}
        chart={{
          sajuYear: chart.sajuYear,
          pillars: chart.pillars,
          dayMaster: chart.dayMaster,
          voidBranches: chart.voidBranches,
          zodiac: chart.zodiac,
          analysis: chart.analysis,
          daeun: chart.daeun,
          seun: chart.seun,
        }}
      />
    </main>
  );
}
