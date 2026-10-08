'use client';

import type { PublicProfile } from '@/lib/profiles';
import { useFanConfig } from './fanConfig';

interface Props {
  /** [A, B] — 비어 있으면 null */
  slots: (PublicProfile | null)[];
  /** 드래그 중 포인터가 올라와 있는 슬롯 번호 */
  hovered: number | null;
  onClear: (index: number) => void;
  /** 슬롯의 화면 좌표를 바깥에서 재야 드롭 판정을 할 수 있다. */
  slotRefs: React.RefObject<(HTMLDivElement | null)[]>;
}

const LABELS = ['A', 'B'];

export function DropSlots({ slots, hovered, onClear, slotRefs }: Props) {
  // 빈 칸도 카드 모양이어야 하니 카드와 같은 크기를 쓴다.
  const { cardW, cardH } = useFanConfig();

  return (
    <div className="flex items-start justify-center gap-5">
      {slots.map((profile, index) => {
        const active = hovered === index;
        return (
          <div key={index} className="flex flex-col items-center gap-2">
            <span
              className="text-xs font-semibold tracking-[0.2em]"
              style={{ color: active ? 'var(--px-cream)' : 'var(--px-on-bg)' }}
            >
              {LABELS[index]}
            </span>

            {/* 칸 바탕은 픽셀 이미지(cardPlace.png, 카드와 같은 160×222) */}
            <div
              ref={(el) => {
                if (slotRefs.current) slotRefs.current[index] = el;
              }}
              className="pixelated flex items-center justify-center transition"
              style={{
                width: cardW,
                height: cardH,
                background: 'url(/cards/cardPlace.png) center / 100% 100% no-repeat',
                color: 'var(--px-cream-ink)',
                transform: active ? 'scale(1.04)' : undefined,
                filter: active ? 'brightness(1.15)' : undefined,
              }}
            >
              {profile ? (
                <button
                  type="button"
                  onClick={() => onClear(index)}
                  className="flex size-full flex-col items-center justify-center gap-1.5 p-4"
                  title="빼기"
                >
                  <span className="line-clamp-3 text-sm font-semibold">{profile.label}</span>
                  <span className="text-[10px] opacity-70">누르면 빼기</span>
                </button>
              ) : (
                <span className="text-[11px] opacity-80">여기로 끌어오기</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
