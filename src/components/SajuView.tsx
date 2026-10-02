'use client';

import { useState } from 'react';
import { Analysis } from './Analysis';
import { BirthDateGate } from './BirthDateGate';
import { CalcBasis } from './CalcBasis';
import { LuckCycles } from './LuckCycles';
import { ManseTable } from './ManseTable';
import { ReadingPanel } from './ReadingPanel';
import type { PublicProfile } from '@/lib/profiles';
import type { SajuChart } from '@/lib/saju/types';

/** 서버가 넘겨 주는 부분 — 생년월일이 담긴 input·basis 는 빠져 있다. */
type ViewChart = Omit<SajuChart, 'input' | 'basis'>;

interface Props {
  profileId: string;
  name: string;
  chart: ViewChart;
}

/**
 * 카드 한 장의 사주 화면.
 *
 * 계산 근거에는 생년월일·출생시각·보정 내역이 그대로 들어 있다. 카드 목록에서
 * 그걸 감춰 놓고 여기서 아무에게나 보여 주면 감춘 의미가 없으므로,
 * 본인 확인을 통과해야 열리게 둔다.
 */
export function SajuView({ profileId, name, chart }: Props) {
  const [basisChart, setBasisChart] = useState<SajuChart | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [basisError, setBasisError] = useState('');

  /** 확인을 통과하면 받은 입력으로 전체 차트를 다시 계산해 근거를 채운다. */
  async function revealBasis(input: unknown) {
    setBasisError('');
    try {
      const response = await fetch('/api/manse', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = (await response.json()) as { chart?: SajuChart; error?: string };
      if (!response.ok || !data.chart) {
        setBasisError(data.error ?? '계산 근거를 불러오지 못했습니다.');
        return;
      }
      setBasisChart(data.chart);
    } catch {
      setBasisError('서버에 연결하지 못했습니다.');
    }
  }

  const profileStub: PublicProfile = { id: profileId, label: name, createdAt: 0 };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{name} 님의 사주</h2>
      </div>

      <ManseTable chart={chart} />
      <Analysis chart={chart} />
      <LuckCycles chart={chart} />

      {basisChart ? (
        <CalcBasis chart={basisChart} />
      ) : (
        <section className="card">
          <h2 className="text-base font-semibold">계산 근거</h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
            적용된 표준시, 진태양시 보정량, 월주 기준 절입 시각을 공개합니다. 생년월일과
            출생 시각이 함께 나오므로 본인 확인을 거쳐야 열립니다.
          </p>
          <button
            type="button"
            onClick={() => setGateOpen(true)}
            className="mt-3 rounded-lg border px-4 py-2 text-sm transition"
            style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
          >
            본인 확인하고 보기
          </button>
          {basisError && (
            <p className="mt-2 text-xs" style={{ color: 'var(--accent)' }}>
              {basisError}
            </p>
          )}
        </section>
      )}

      <ReadingPanel
        endpoint="/api/reading"
        body={{ profileId }}
        description="위 만세력을 그대로 근거 삼아 풀이해 드려요. 이 단계에서만 AI를 씁니다."
      />

      {gateOpen && (
        <BirthDateGate
          profile={profileStub}
          onVerified={(full) => {
            setGateOpen(false);
            void revealBasis(full.input);
          }}
          onCancel={() => setGateOpen(false)}
        />
      )}
    </div>
  );
}
