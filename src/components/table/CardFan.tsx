'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { PublicProfile } from '@/lib/profiles';
import { CARD_H, CARD_W, TableCard } from './TableCard';

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
}

/**
 * 부채꼴의 벌어짐.
 *
 * 장수가 적어도 호가 보이도록 한 장당 각도를 넉넉히 주고, 많아지면 전체 폭에 맞춰
 * 자동으로 좁아지게 한다.
 */
const MAX_SPREAD_DEG = 96;
const MAX_STEP_DEG = 15;

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
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);

  useLayoutEffect(() => {
    const measure = () => setWidth(wrapRef.current?.clientWidth ?? 800);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // 카드 + 맨 끝의 '추가' 자리
  const slots = [...profiles.map((p) => ({ kind: 'card' as const, profile: p })), { kind: 'add' as const }];
  const count = slots.length;

  const step = Math.min(MAX_STEP_DEG, MAX_SPREAD_DEG / Math.max(count - 1, 1));
  const start = -(step * (count - 1)) / 2;

  /*
   * 반지름은 화면 너비가 아니라 "카드가 얼마나 드러나야 하는가"로 정한다.
   *
   * 이웃한 두 카드의 가로 간격은 radius × sin(step) 이다. 좁다고 반지름을 줄이면
   * 이 간격이 카드 폭보다 훨씬 작아져 이름이 옆 카드에 완전히 가린다.
   * 그래서 최소로 드러날 폭을 먼저 정하고 거기서 반지름을 역산한다.
   * 넘치는 가로 폭은 스크롤로 받는다.
   */
  const MIN_REVEAL = 54;
  const radius = Math.min(
    760,
    Math.max(MIN_REVEAL / Math.sin((step * Math.PI) / 180), width * 0.62, 320),
  );

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
   */
  const maxAngle = (Math.abs(start) * Math.PI) / 180;
  const drop = radius * (1 - Math.cos(maxAngle));
  const height = Math.round(CARD_H + drop);

  /** 부채꼴이 실제로 차지하는 가로 폭. 이보다 좁으면 양끝이 잘린다. */
  const fanWidth = Math.ceil(2 * (radius * Math.sin(maxAngle) + CARD_W / 2) + 24);

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
