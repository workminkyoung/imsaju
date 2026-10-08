'use client';

import { useLayoutEffect, useRef } from 'react';
import type { PublicProfile } from '@/lib/profiles';
import { useFanConfig } from './fanConfig';
import { CardFront } from './TableCard';

/** 막 놓인 카드 — 놓은 자리에서 칸으로 날아 들어가는 애니메이션의 출발점 */
export interface Landing {
  index: number;
  /** 놓은 순간 포인터(=끌던 카드 가운데) 화면 좌표 */
  x: number;
  y: number;
  /** 끌던 카드의 배율(부채꼴 배율) */
  scale: number;
  /** 같은 칸에 연달아 놓아도 다시 움직이게 하는 값 */
  key: number;
}

interface Props {
  /** [A, B] — 비어 있으면 null */
  slots: (PublicProfile | null)[];
  /** 드래그 중 포인터가 올라와 있는 슬롯 번호 */
  hovered: number | null;
  onClear: (index: number) => void;
  landing: Landing | null;
  /** 슬롯의 화면 좌표를 바깥에서 재야 드롭 판정을 할 수 있다. */
  slotRefs: React.RefObject<(HTMLDivElement | null)[]>;
}

const LABELS = ['A', 'B'];

export function DropSlots({ slots, hovered, onClear, slotRefs, landing }: Props) {
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
                <PlacedCard
                  profile={profile}
                  landing={landing?.index === index ? landing : null}
                  onClear={() => onClear(index)}
                />
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

/**
 * 칸에 들어간 카드. 부채꼴의 카드 앞면을 그대로 보여 줘야 "놓였다"가 바로 보인다.
 * 막 놓였으면 놓은 자리(끌던 카드 모양 그대로)에서 칸으로 날아 들어간다.
 */
function PlacedCard({
  profile,
  landing,
  onClear,
}: {
  profile: PublicProfile;
  landing: Landing | null;
  onClear: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !landing) return;
    const rect = el.getBoundingClientRect();
    const dx = landing.x - (rect.left + rect.width / 2);
    const dy = landing.y - (rect.top + rect.height / 2);
    // 끌던 카드(CardTable 의 드래그 카드)와 같은 모양에서 출발해 살짝 튕기며 자리 잡는다.
    const animation = el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${landing.scale}) rotate(-4deg)` },
        { transform: 'translate(0, 0) scale(1.06) rotate(0deg)', offset: 0.75 },
        { transform: 'none' },
      ],
      { duration: 360, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
    );
    // 개발 모드(StrictMode)는 효과를 두 번 돌린다. 앞의 것을 지워야 두 번째가 제자리를 잰다.
    return () => animation.cancel();
    // landing.key 가 바뀔 때만 다시 움직인다.
  }, [landing?.key]);

  return (
    <div ref={ref} className="table-card-face relative size-full overflow-hidden rounded-xl">
      <CardFront profile={profile} />
      <button
        type="button"
        onClick={onClear}
        className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full border text-xs font-bold leading-none transition hover:brightness-125"
        style={{
          background: 'var(--px-deep)',
          borderColor: 'var(--px-cream)',
          color: 'var(--px-cream-ink)',
        }}
        aria-label={`${profile.label} 빼기`}
        title="빼기"
      >
        ×
      </button>
    </div>
  );
}
