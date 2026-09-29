'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Analysis } from '@/components/Analysis';
import { BirthForm } from '@/components/BirthForm';
import { CalcBasis } from '@/components/CalcBasis';
import { LuckCycles } from '@/components/LuckCycles';
import { ManseTable } from '@/components/ManseTable';
import { ReadingPanel } from '@/components/ReadingPanel';
import type { SajuChart, SajuInput } from '@/lib/saju/types';

export default function SajuPage() {
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
    <main className="space-y-4">
      <Link
        href="/"
        className="inline-block text-xs text-[var(--text-muted)] transition hover:text-[var(--accent)]"
      >
        ← 처음으로
      </Link>

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
          <ReadingPanel endpoint="/api/reading" body={input} />
        </div>
      )}
    </main>
  );
}
