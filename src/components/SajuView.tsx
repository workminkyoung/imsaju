'use client';

import { Analysis } from './Analysis';
import { LuckCycles } from './LuckCycles';
import { ManseTable } from './ManseTable';
import { ReadingPanel } from './ReadingPanel';
import { IconDiamond, IconElements, IconLuck, IconTenGods } from './icons';
import { saveReading, type StoredReading } from '@/lib/readings';
import type { SajuChart } from '@/lib/saju/types';

interface Props {
  /** 풀이를 어느 카드에 묶어 둘지 */
  profileId: string;
  name: string;
  chart: SajuChart;
  /** 이 카드로 이미 만들어 둔 풀이. 없으면 null. */
  savedReading: StoredReading | null;
}

/** 사주풀이가 무엇을 근거로 삼는지 — 위에 그린 칸들과 같은 아이콘을 쓴다. */
const READING_STEPS = [
  { icon: <IconElements className="size-4" />, label: '오행 분포', hint: '균형과 기운의 흐름' },
  { icon: <IconTenGods className="size-4" />, label: '십신 · 세력', hint: '성향과 관계의 구조' },
  { icon: <IconLuck className="size-4" />, label: '대운 · 세운', hint: '시기별 운의 흐름' },
] as const;

/**
 * 카드 한 장의 사주 화면.
 *
 * 읽는 순서를 화면이 먼저 말해 준다 — 원국(여덟 글자)에서 출발해 오행·십신·대운으로
 * 풀어 보고, 그 전부를 근거로 삼아 사주풀이로 넘어간다. 그래서 분석 칸들을 머리띠
 * 아래 한 덩어리로 묶고, 사주풀이는 화살표로 떼어 내 테두리를 둘렀다.
 *
 * 풀이를 요청할 때만 입력을 서버로 보내고, 서버는 다시 계산해 쓰고 저장하지 않는다.
 */
export function SajuView({ profileId, name, chart, savedReading }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{name} 님의 사주</h2>

      {/* 머리띠 — 아래 세 칸이 한 묶음임을 알린다 */}
      <section className="card flex items-center gap-3 py-3.5">
        <IconDiamond className="size-5 shrink-0" style={{ color: 'var(--accent)' }} />
        <h3 className="text-base font-bold whitespace-nowrap">만세력 분석 결과</h3>
        <p className="hidden text-xs text-[var(--text-muted)] sm:block">
          당신의 사주를 구성하는 핵심 데이터입니다.
        </p>
        <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
        <IconDiamond className="size-3.5 shrink-0" style={{ color: 'var(--border)' }} />
      </section>

      {/* 여덟 글자 자체. 아래 분석이 모두 여기서 나오므로 맨 앞에 둔다 */}
      <ManseTable chart={chart} />

      {/* 원국에서 뽑아낸 것들 — 둘은 나란히 읽는 편이 빠르다 */}
      <Analysis chart={chart} />

      <LuckCycles chart={chart} />

      {/* 분석에서 풀이로 넘어간다는 표시 */}
      <div className="flex justify-center py-1" aria-hidden>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-6 opacity-70"
        >
          <path d="M12 4v13M6.5 12.5 12 18l5.5-5.5" />
        </svg>
      </div>

      <ReadingPanel
        endpoint="/api/reading"
        body={chart.input}
        title="이 만세력으로 사주풀이하기"
        description="위 만세력 데이터를 바탕으로 나만의 사주 해석을 확인해 보세요."
        actionLabel="사주풀이 시작하기"
        variant="hero"
        steps={READING_STEPS}
        once
        saved={savedReading}
        onComplete={(text, model) => saveReading(profileId, text, model)}
      />
    </div>
  );
}
