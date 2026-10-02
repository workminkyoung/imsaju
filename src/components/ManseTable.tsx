'use client';

import type { Element } from '@/lib/saju/constants';
import type { Pillar, SajuChart } from '@/lib/saju/types';

/**
 * 원국 표가 실제로 쓰는 부분만.
 *
 * 궁합 화면은 생년월일을 뺀 축소본을 받으므로 SajuChart 전체를 요구하면 안 된다.
 */
export type ManseChart = Pick<
  SajuChart,
  'pillars' | 'dayMaster' | 'voidBranches' | 'zodiac'
> & {
  /** 궁합 화면에서는 생년을 평문으로 넘기지 않으므로 없을 수 있다. 그때는 띠만 보여 준다. */
  sajuYear?: number;
};

const ELEMENT_VAR: Record<Element, string> = {
  목: 'var(--wood)',
  화: 'var(--fire)',
  토: 'var(--earth)',
  금: 'var(--metal)',
  수: 'var(--water)',
};

/** 원국은 시주부터 연주 순으로, 오른쪽이 과거가 되게 배열하는 것이 관례다. */
function Cell({ label, pillar }: { label: string; pillar: Pillar | null }) {
  if (!pillar) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-3"
        style={{ borderColor: 'var(--border)' }}>
        <span className="text-xs text-[var(--text-muted)]">{label}</span>
        <span className="py-6 text-xs text-[var(--text-muted)]">시각 모름</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-3 text-center" style={{ borderColor: 'var(--border)' }}>
      <div className="text-xs text-[var(--text-muted)]">{label}</div>

      <div className="mt-1.5 text-[10px] text-[var(--text-muted)]">{pillar.tenGodOfStem}</div>
      <div className="ganji text-3xl leading-tight" style={{ color: ELEMENT_VAR[pillar.stemElement] }}>
        {pillar.stem}
      </div>
      <div className="text-[11px] text-[var(--text-muted)]">
        {pillar.stemKo} · {pillar.stemYinYang}{pillar.stemElement}
      </div>

      <div className="ganji mt-2.5 text-3xl leading-tight" style={{ color: ELEMENT_VAR[pillar.branchElement] }}>
        {pillar.branch}
      </div>
      <div className="text-[11px] text-[var(--text-muted)]">
        {pillar.branchKo} · {pillar.branchYinYang}{pillar.branchElement}
      </div>
      <div className="mt-0.5 text-[10px] text-[var(--text-muted)]">{pillar.tenGodOfBranch}</div>

      <div className="mt-2.5 border-t pt-2 text-[10px] leading-relaxed text-[var(--text-muted)]"
        style={{ borderColor: 'var(--border)' }}>
        <div className="ganji">
          {pillar.hiddenStems.map((h) => h.stem).join(' ')}
        </div>
        <div className="mt-1">{pillar.twelveStage}</div>
        <div>{pillar.nayin}</div>
      </div>
    </div>
  );
}

export function ManseTable({ chart }: { chart: ManseChart }) {
  const { pillars } = chart;

  return (
    <section className="card">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">원국</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
          <span>
            일간{' '}
            <strong className="ganji" style={{ color: ELEMENT_VAR[chart.dayMaster.element as Element] }}>
              {chart.dayMaster.stem}
            </strong>{' '}
            {chart.dayMaster.yinYang}{chart.dayMaster.element}
          </span>
          <span>{chart.sajuYear ? `${chart.sajuYear}년 ` : ''}{chart.zodiac}띠</span>
          <span>공망 <span className="ganji">{chart.voidBranches.join('')}</span></span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <Cell label="시주" pillar={pillars.hour} />
        <Cell label="일주" pillar={pillars.day} />
        <Cell label="월주" pillar={pillars.month} />
        <Cell label="연주" pillar={pillars.year} />
      </div>

      <p className="mt-3 text-[11px] text-[var(--text-muted)]">
        각 칸은 위부터 천간 십신 · 천간 · 지지 · 지지 십신 · 지장간 · 12운성 · 납음 순입니다.
      </p>
    </section>
  );
}
