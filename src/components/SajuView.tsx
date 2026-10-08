'use client';

import { Analysis } from './Analysis';
import { CalcBasis } from './CalcBasis';
import { LuckCycles } from './LuckCycles';
import { ManseTable } from './ManseTable';
import { ReadingPanel } from './ReadingPanel';
import type { SajuChart } from '@/lib/saju/types';

interface Props {
  name: string;
  chart: SajuChart;
}

/**
 * 카드 한 장의 사주 화면.
 *
 * 카드는 이 브라우저에만 있으므로 계산 근거(생년월일·출생시각·보정 내역)도 그대로 보여 준다.
 * 풀이를 요청할 때만 입력을 서버로 보내고, 서버는 다시 계산해 쓰고 저장하지 않는다.
 */
export function SajuView({ name, chart }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{name} 님의 사주</h2>
      </div>

      <ManseTable chart={chart} />
      <Analysis chart={chart} />
      <LuckCycles chart={chart} />
      <CalcBasis chart={chart} />

      <ReadingPanel
        endpoint="/api/reading"
        body={chart.input}
        description="위 만세력을 그대로 근거 삼아 풀이해 드려요. 이 단계에서만 AI를 씁니다."
      />
    </div>
  );
}
