'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PublicProfile } from '@/lib/profiles';
import { TableCard } from './TableCard';
import {
  CARD_BASE_H,
  CARD_BASE_W,
  cardSize,
  useFanConfig,
  type FanMetrics,
} from './fanConfig';

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
    cardScale,
    spreadDeg,
    stepDeg,
    headroom,
    minReveal,
    minRadius: minRadiusCfg,
    maxRadius,
    widthRatio,
    minScale,
    areaGapTop,
    areaPadBottom,
    slotScale,
  } = useFanConfig();

  // 가로세로를 따로 두지 않는다. 배율 하나에서 비율대로 뽑는다.
  const { w: cardW, h: cardH } = cardSize(cardScale);

  /** 마우스를 올린 카드. 겹쳐 가린 앞면을 보이도록 들어 올려 맨 위로 낸다. */
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  /** 부채꼴이 쓸 수 있는 공간. 세로는 바깥 칸의 위쪽부터 화면 아래 끝까지. */
  const [box, setBox] = useState({ width: 800, height: 420 });

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const top = el.parentElement?.getBoundingClientRect().top ?? 0;
      setBox({
        width: el.clientWidth || 800,
        // 아래 여백은 영역 바깥이므로 빼고 잰다. 하한은 두지 않는다 — 좁으면
        // 그만큼 배율(scale)이 줄어 맞춘다(minScale 까지).
        height: Math.max(window.innerHeight - top - areaPadBottom, 1),
      });
    };
    measure();
    window.addEventListener('resize', measure);

    /*
     * 창 크기는 그대로인 채 영역만 움직이는 경우가 많다 — 칸을 키우거나 위 간격을 넓히면
     * 영역이 아래로 밀린다. 이때 두 가지를 다 놓치지 않아야 한다.
     *
     *  - 영역의 **크기**가 바뀌는 경우: 바깥 칸을 ResizeObserver 로 본다.
     *  - 영역의 **위치**만 바뀌는 경우: 내용이 길어져 페이지가 화면보다 커지면 영역은
     *    같은 높이인 채 아래로만 내려간다. ResizeObserver 는 크기만 보므로 이걸 놓친다.
     *    그래서 위쪽 내용을 담은 칸도 함께 보고, 설정값도 의존성에 넣어 다시 재게 한다.
     *
     * 놓치면 카드 크기 상한이 옛 값에 머물러, 영역을 벗어나는 크기를 허용해 버린다.
     */
    const observer = new ResizeObserver(measure);
    for (const target of [el.parentElement, el.parentElement?.parentElement]) {
      if (target) observer.observe(target);
    }

    return () => {
      window.removeEventListener('resize', measure);
      observer.disconnect();
    };
  }, [areaPadBottom, areaGapTop, slotScale]);

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
   * 부채꼴은 설계 크기(cardW×cardH)로 계산한다. 영역에 다 들어오지 않으면 반지름을
   * 깎는 대신 부채꼴 전체를 한 덩어리로 줄인다(아래 scale). 반지름을 깎으면 카드는
   * 그대로인 채 호만 휘어 겹침이 늘지만, 통째로 줄이면 모양이 그대로 유지된다.
   */
  const sag = 1 - Math.cos(maxAngle);
  const sinMax = Math.sin(maxAngle);
  const corner = (cardW / 2) * sinMax;
  const radius = wide;

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
  const fanWidth = Math.ceil(2 * (radius * sinMax + cardW / 2) + 24);

  /*
   * 카드 배율을 올릴 수 있는 상한 — 부채꼴이 영역을 벗어나지 않는 가장 큰 배율.
   *
   * 높이도 폭도 배율 s 에 대한 1차식이라 그대로 뒤집어 풀 수 있다.
   *   height(s) = s·(BASE_H·(1−sag) + BASE_W/2·sin) + radius·sag + headroom
   *   width(s)  = s·BASE_W + 2·radius·sin + 24
   * 반지름은 배율과 무관(장수·최소 드러남·화면 폭에서 나온다)하므로 상수로 두고 푼다.
   * box 는 영역이 바뀔 때마다 다시 재므로, 영역을 만지면 이 상한도 따라 움직인다.
   *
   * 넘겨서 설정해도 아래 scale 이 알아서 줄이기는 한다. 다만 그때부터는 "설계한 크기"와
   * 화면에 보이는 크기가 달라지므로, 튜너에서는 여기까지만 올리도록 막는다.
   */
  const perScale = CARD_BASE_H * (1 - sag) + (CARD_BASE_W / 2) * sinMax;
  const maxCardScale = Math.max(
    0.3,
    Math.min(
      (box.height - radius * sag - headroom) / perScale,
      (box.width - 24 - 2 * radius * sinMax) / CARD_BASE_W,
    ),
  );

  /*
   * 영역에 맞춰 부채꼴 전체를 줄이는 배율. 카드 안의 글자·막대까지 같은 비율로 줄어든다.
   * 너무 작아지면 읽을 수 없으니 minScale 아래로는 줄이지 않고, 그때 넘치는 폭은
   * 가로 스크롤로 받는다.
   */
  const scale = Math.max(
    Math.min(minScale, 1),
    Math.min(1, box.height / height, box.width / fanWidth),
  );
  const shownHeight = Math.round(height * scale);
  const shownWidth = Math.ceil(fanWidth * scale);

  /*
   * 부채꼴이 화면보다 넓으면 가로로 스크롤된다. 그냥 두면 왼쪽 끝에서 시작해
   * 한쪽 카드만 보이므로, 가운데가 보이도록 맞춰 둔다.
   */
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, [shownWidth, profiles.length]);

  // 튜너가 지금 그려진 수치를 그대로 볼 수 있게 올려 보낸다.
  useEffect(() => {
    onMetrics?.({
      radius,
      drop,
      height,
      fanWidth,
      stepDeg: step,
      available: box.height,
      scale,
      maxCardScale,
    });
  }, [onMetrics, radius, drop, height, fanWidth, step, box.height, scale, maxCardScale]);

  return (
    <div
      ref={wrapRef}
      className="relative mx-auto w-full overflow-x-auto overflow-y-hidden"
      style={{ height: shownHeight }}
    >
      <div className="relative mx-auto h-full" style={{ minWidth: shownWidth }}>
        {/* 설계 크기로 그린 부채꼴을 통째로 줄인다 */}
        <div
          className="absolute bottom-0 left-1/2"
          style={{
            width: fanWidth,
            height,
            transform: `translateX(-50%) scale(${scale})`,
            transformOrigin: 'bottom center',
          }}
        >
        {slots.map((slot, i) => {
          const angle = start + step * i;
          const key = slot.kind === 'add' ? '__add__' : slot.profile.id;
          const placed = slot.kind === 'card' && placedIds.includes(slot.profile.id);
          const flipped = slot.kind === 'card' && flippedId === slot.profile.id;
          const hovered = slot.kind === 'card' && hoveredId === slot.profile.id;

          return (
            <div
              key={key}
              className="absolute left-1/2 transition-transform duration-300"
              style={{
                // 카드 아래 radius 만큼 떨어진 지점을 축으로 돌린다 → 부채꼴
                bottom: drop,
                transformOrigin: `center ${radius}px`,
                transform: `translateX(-50%) rotate(${angle}deg)${hovered && !flipped ? ' translateY(-14px)' : ''}`,
                zIndex: flipped ? 50 : hovered ? 40 : i,
              }}
              onPointerEnter={(e) => {
                if (slot.kind === 'card' && e.pointerType === 'mouse') setHoveredId(slot.profile.id);
              }}
              onPointerLeave={() => setHoveredId(null)}
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
    </div>
  );
}
