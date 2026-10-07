'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PublicProfile } from '@/lib/profiles';
import { TableCard } from './TableCard';
import { useFanConfig, type FanMetrics } from './fanConfig';

interface Props {
  profiles: PublicProfile[];
  /** 지금 뒤집혀 있는 카드 */
  flippedId: string | null;
  /** 상단 슬롯에 올라가 있어 부채꼴에서는 비워 둘 카드들 */
  placedIds: string[];
  onFlip: (id: string) => void;
  onAdd: () => void;
  onViewSaju: (id: string) => void;
  onEdit: (profile: PublicProfile) => void;
  /** 드래그 시작 — 포인터 이벤트를 그대로 넘겨 받는다 */
  onDragStart: (profile: PublicProfile, event: React.PointerEvent) => void;
  /** 계산 결과를 바깥(튜너)에 알려 준다 */
  onMetrics?: (metrics: FanMetrics) => void;
}

/*
 * 모양을 정하는 숫자는 모두 fanConfig.ts 에 있다. 여기서는 그 값으로 호를 그리는
 * 계산만 한다. 값을 바꿔 보려면 화면에서 튜너(`)를 열면 된다.
 */

/**
 * 카드를 반원으로 펼친다.
 *
 * 각 카드를 아래쪽 먼 지점을 축으로 회전시키면 부채꼴이 된다.
 * 축 거리(반지름)를 화면 너비에 맞춰 줄여 좁은 화면에서도 모양이 유지되게 한다.
 */
export function CardFan({
  profiles,
  flippedId,
  placedIds,
  onFlip,
  onAdd,
  onViewSaju,
  onEdit,
  onDragStart,
  onMetrics,
}: Props) {
  const {
    cardW,
    cardH,
    spreadDeg,
    stepDeg,
    headroom,
    minReveal,
    minRadius: minRadiusCfg,
    maxRadius,
    widthRatio,
  } = useFanConfig();

  const wrapRef = useRef<HTMLDivElement>(null);
  /** 부채꼴이 쓸 수 있는 공간. 세로는 바깥 칸의 위쪽부터 화면 아래 끝까지. */
  const [box, setBox] = useState({ width: 800, height: 420 });

  useLayoutEffect(() => {
    const measure = () => {
      const el = wrapRef.current;
      if (!el) return;
      const top = el.parentElement?.getBoundingClientRect().top ?? 0;
      setBox({
        width: el.clientWidth || 800,
        height: Math.max(window.innerHeight - top, cardH + headroom),
      });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [cardH, headroom]);

  // 카드 + 맨 끝의 '추가' 자리
  const slots = [
    ...profiles.map((p) => ({ kind: 'card' as const, profile: p })),
    { kind: 'add' as const },
  ];
  const count = slots.length;

  const step = Math.min(stepDeg, spreadDeg / Math.max(count - 1, 1));
  const start = -(step * (count - 1)) / 2;

  /*
   * 반지름은 화면 너비가 아니라 "카드가 얼마나 드러나야 하는가"로 정한다.
   *
   * 이웃한 두 카드의 가로 간격은 radius × sin(step) 이다. 좁다고 반지름을 줄이면
   * 이 간격이 카드 폭보다 훨씬 작아져 이름이 옆 카드에 완전히 가린다.
   * 그래서 최소로 드러날 폭을 먼저 정하고 거기서 반지름을 역산한다.
   * 넘치는 가로 폭은 스크롤로 받는다.
   */
  const maxAngle = (Math.abs(start) * Math.PI) / 180;

  /** 이보다 작아지면 이름이 옆 카드에 가린다. 어떤 경우에도 여기까지만 줄인다. */
  const minRadius = Math.max(minReveal / Math.sin((step * Math.PI) / 180), minRadiusCfg);
  const wide = Math.min(maxRadius, Math.max(minRadius, box.width * widthRatio));

  /*
   * 반지름이 커지면 양끝 카드가 그만큼 아래로 내려가 부채꼴이 높아진다.
   * 주어진 높이를 넘기면 세로로 잘리므로, 높이에 맞춰 거꾸로 반지름을 깎는다.
   * (높이 식은 아래 overhang 과 같은 것을 radius 에 대해 푼 것이다.)
   */
  const sag = 1 - Math.cos(maxAngle);
  const corner = (cardW / 2) * Math.sin(maxAngle);
  const room = box.height - headroom - cardH - corner;
  const byHeight = sag > 0 ? room / sag + cardH : Infinity;
  const radius = Math.max(minRadius, Math.min(wide, byHeight));

  /*
   * 부채꼴이 화면보다 넓으면 가로로 스크롤된다. 그냥 두면 왼쪽 끝에서 시작해
   * 한쪽 카드만 보이므로, 가운데가 보이도록 맞춰 둔다.
   */
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, [radius, profiles.length]);

  /*
   * 아래쪽 축으로 돌리면 바깥 카드는 **내려간다**. 그만큼 아래에 자리를 비워 두지 않으면
   * 양끝 카드가 잘린다. 장수가 늘수록 각도가 커지므로 고정값으로 두면 반드시 깨진다.
   *
   * 내려가는 양은 축까지의 거리가 아니라 카드 **아래 모서리**가 그리는 호로 정해진다.
   * 아래 모서리는 축에서 radius − cardH 만큼 떨어져 있고, 기울어진 만큼 바깥 모서리가
   * 한 번 더 (cardW/2)·sin 만큼 처진다. 둘을 더해야 실제로 필요한 자리가 나온다.
   */
  const drop = (radius - cardH) * sag + corner;
  const height = Math.round(cardH + drop + headroom);

  /** 부채꼴이 실제로 차지하는 가로 폭. 이보다 좁으면 양끝이 잘린다. */
  const fanWidth = Math.ceil(2 * (radius * Math.sin(maxAngle) + cardW / 2) + 24);

  // 튜너가 지금 그려진 수치를 그대로 볼 수 있게 올려 보낸다.
  useEffect(() => {
    onMetrics?.({
      radius,
      drop,
      height,
      fanWidth,
      stepDeg: step,
      available: box.height,
    });
  }, [onMetrics, radius, drop, height, fanWidth, step, box.height]);

  return (
    <div
      ref={wrapRef}
      className="relative mx-auto w-full overflow-x-auto overflow-y-hidden"
      style={{ height }}
    >
      <div className="relative mx-auto h-full" style={{ minWidth: fanWidth }}>
        {slots.map((slot, i) => {
          const angle = start + step * i;
          const key = slot.kind === 'add' ? '__add__' : slot.profile.id;
          const placed = slot.kind === 'card' && placedIds.includes(slot.profile.id);

          return (
            <div
              key={key}
              className="absolute left-1/2 transition-transform duration-300"
              style={{
                // 카드 아래 radius 만큼 떨어진 지점을 축으로 돌린다 → 부채꼴
                bottom: drop,
                transformOrigin: `center ${radius}px`,
                transform: `translateX(-50%) rotate(${angle}deg)`,
                zIndex: slot.kind === 'card' && flippedId === slot.profile.id ? 50 : i,
              }}
            >
              {slot.kind === 'add' ? (
                <TableCard kind="add" onAdd={onAdd} />
              ) : (
                <TableCard
                  kind="profile"
                  profile={slot.profile}
                  flipped={flippedId === slot.profile.id}
                  dimmed={placed}
                  onFlip={() => onFlip(slot.profile.id)}
                  onViewSaju={() => onViewSaju(slot.profile.id)}
                  onEdit={() => onEdit(slot.profile)}
                  onDragStart={(e) => onDragStart(slot.profile, e)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
