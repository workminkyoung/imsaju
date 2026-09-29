'use client';

import { useState } from 'react';
import { Analysis } from '@/components/Analysis';
import { BirthForm } from '@/components/BirthForm';
import { CalcBasis } from '@/components/CalcBasis';
import { LuckCycles } from '@/components/LuckCycles';
import { ManseTable } from '@/components/ManseTable';
import { ReadingPanel } from '@/components/ReadingPanel';
import type { SajuChart, SajuInput } from '@/lib/saju/types';

export default function Home() {
  const [chart, setChart] = useState<SajuChart | null>(null);
  const [input, setInput] = useState<SajuInput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function calculate(next: SajuInput) {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/manse', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(next),
      });
      const data = (await response.json()) as { chart?: SajuChart; error?: string };

      if (!response.ok || !data.chart) {
        setError(data.error ?? '만세력을 계산하지 못했습니다.');
        setChart(null);
        return;
      }

      setChart(data.chart);
      setInput(next);
      // 결과가 폼 아래에 붙으므로 부드럽게 이동시킨다.
      requestAnimationFrame(() => {
        document.getElementById('result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch {
      setError('서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      setChart(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="space-y-6">
      {!chart && (
        <section className="card" style={{ background: 'var(--surface-sunken)' }}>
          <h2 className="text-sm font-semibold">계산 방식</h2>
          <ul className="mt-2 space-y-1 text-xs leading-relaxed text-[var(--text-muted)]">
            <li>· 절기를 근사표가 아니라 태양 겉보기 황경으로 직접 계산합니다.</li>
            <li>· 1908년 지방시부터 1954·1961년 표준시 변경, 1948~1988년 서머타임까지 자동 반영합니다.</li>
            <li>· 출생지 경도로 진태양시를 보정합니다 (서울 기준 −32분).</li>
            <li>· 어떤 값이 어떻게 적용됐는지 「계산 근거」에서 전부 공개합니다.</li>
          </ul>
        </section>
      )}

      <BirthForm onSubmit={calculate} loading={loading} />

      {error && (
        <div className="card text-sm" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
          {error}
        </div>
      )}

      {chart && input && (
        <div id="result" className="space-y-4 pt-2">
          <ManseTable chart={chart} />
          <Analysis chart={chart} />
          <LuckCycles chart={chart} />
          <CalcBasis chart={chart} />
          <ReadingPanel input={input} />
        </div>
      )}
    </main>
  );
}
