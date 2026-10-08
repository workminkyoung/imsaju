'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CompatibilityResult } from '@/components/CompatibilityResult';
import { ManseTable } from '@/components/ManseTable';
import { ReadingPanel } from '@/components/ReadingPanel';
import { RelationshipPicker } from '@/components/RelationshipPicker';
import { DEFAULT_RELATIONSHIP, type RelationshipId } from '@/lib/relationship';
import type { PublicChart } from '@/lib/compatibilityRequest';
import type { CompatibilityResult as Result } from '@/lib/saju/compatibility';

interface ApiResponse {
  chartA: PublicChart;
  chartB: PublicChart;
  names: { a: string; b: string };
  compatibility: Result;
  error?: string;
}

/**
 * 궁합 결과.
 *
 * 어떤 두 사람을 볼지는 메인 카드 테이블에서 정하고, 여기는 관계 설정과 결과만 맡는다.
 * 카드 id 는 주소로 받으므로 새로고침해도 유지되고 링크로 공유할 수도 있다.
 */
function CompatibilityInner() {
  const params = useSearchParams();
  const aId = params.get('a') ?? '';
  const bId = params.get('b') ?? '';

  const [relationship, setRelationship] = useState<RelationshipId>(DEFAULT_RELATIONSHIP);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const calculate = useCallback(
    async (relationshipId: RelationshipId) => {
      if (!aId || !bId) return;
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/compatibility', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ aId, bId, relationship: relationshipId }),
        });
        const data = (await response.json()) as ApiResponse;
        if (!response.ok || !data.compatibility) {
          setError(data.error ?? '궁합을 계산하지 못했습니다.');
          setResult(null);
          return;
        }
        setResult(data);
      } catch {
        setError('서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [aId, bId],
  );

  // 들어오자마자 한 번 계산한다. 관계는 수치를 바꾸지 않으므로 기본값으로 먼저 보여 준다.
  useEffect(() => {
    void calculate(DEFAULT_RELATIONSHIP);
  }, [calculate]);

  if (!aId || !bId) {
    return (
      <main className="page-shell space-y-4 pb-12">
        <BackLink />
        <div className="card text-sm">
          볼 카드가 정해지지 않았습니다. 카드 테이블에서 두 장을 위 칸에 올려 주세요.
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell space-y-4 pb-12">
      <BackLink />

      <RelationshipPicker
        aName={result?.names.a ?? 'A'}
        bName={result?.names.b ?? 'B'}
        value={relationship}
        onChange={(id) => {
          setRelationship(id);
          // 수치는 그대로지만 풀이 관점이 달라지므로 다시 받아 둔다.
          void calculate(id);
        }}
      />

      {loading && !result && (
        <p className="py-10 text-center text-sm text-[var(--text-muted)]">궁합을 계산하는 중…</p>
      )}

      {error && (
        <div className="card text-sm" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <CompatibilityResult
            result={result.compatibility}
            aName={result.names.a}
            bName={result.names.b}
            strengthA={result.chartA.analysis.strength.verdict}
            strengthB={result.chartB.analysis.strength.verdict}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-medium text-[var(--text-muted)]">
                {result.names.a} 원국
              </h3>
              <ManseTable chart={result.chartA} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-[var(--text-muted)]">
                {result.names.b} 원국
              </h3>
              <ManseTable chart={result.chartB} />
            </div>
          </div>

          <ReadingPanel
            endpoint="/api/compatibility/reading"
            body={{ aId, bId, relationship }}
            title="궁합 풀이"
            description="위 궁합 계산을 그대로 근거 삼아 풀이해 드려요. 이 단계에서만 AI를 씁니다."
            actionLabel="궁합 풀이 생성"
          />
        </div>
      )}
    </main>
  );
}

function BackLink() {
  return (
    <Link
      href="/"
      className="inline-block text-xs text-[var(--text-muted)] transition hover:text-[var(--px-cream)]"
    >
      ← 카드 테이블로
    </Link>
  );
}

export default function CompatibilityPage() {
  // useSearchParams 는 Suspense 안에 있어야 한다.
  return (
    <Suspense fallback={<main className="page-shell py-10 text-center text-sm text-[var(--text-muted)]">불러오는 중…</main>}>
      <CompatibilityInner />
    </Suspense>
  );
}
