'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { SajuView } from '@/components/SajuView';
import { getProfile, touchProfile, type StoredProfile } from '@/lib/profiles';
import { computeSaju } from '@/lib/saju';
import type { SajuChart } from '@/lib/saju/types';

type State =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error'; message: string }
  | { status: 'ready'; profile: StoredProfile; chart: SajuChart };

/**
 * 카드 한 장의 사주 풀이.
 *
 * 카드는 이 브라우저에만 있으므로 서버가 아니라 여기서 꺼내 계산한다.
 * 그래서 이 주소는 카드를 만든 브라우저에서만 열린다.
 */
export default function SajuPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    const profile = getProfile(id);
    if (!profile) {
      setState({ status: 'missing' });
      return;
    }
    touchProfile(id);
    try {
      setState({ status: 'ready', profile, chart: computeSaju(profile.input) });
    } catch (error) {
      const message = error instanceof Error ? error.message : '만세력을 계산하지 못했습니다.';
      setState({ status: 'error', message });
    }
  }, [id]);

  return (
    <main className="page-shell space-y-4 pb-12">
      <Link
        href="/"
        className="inline-block text-xs text-[var(--text-muted)] transition hover:text-[var(--px-cream)]"
      >
        ← 카드 테이블로
      </Link>

      {state.status === 'loading' && (
        <p className="py-10 text-center text-sm text-[var(--text-muted)]">불러오는 중…</p>
      )}

      {state.status === 'missing' && (
        <div className="card text-sm leading-relaxed">
          이 브라우저에 없는 카드입니다. 카드는 만든 브라우저에만 저장되고, 오래 쓰지 않으면
          지워집니다.
        </div>
      )}

      {state.status === 'error' && (
        <div className="card text-sm" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
          {state.message}
        </div>
      )}

      {state.status === 'ready' && (
        <SajuView name={state.profile.label} chart={state.chart} />
      )}
    </main>
  );
}
