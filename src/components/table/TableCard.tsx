'use client';

import { useRef } from 'react';
import type { PublicProfile } from '@/lib/profiles';
import { useFanConfig } from './fanConfig';

type Props =
  | { kind: 'add'; onAdd: () => void }
  | {
      kind: 'profile';
      profile: PublicProfile;
      flipped: boolean;
      /** 상단 슬롯에 올라가 있으면 흐리게 */
      dimmed: boolean;
      onFlip: () => void;
      onViewSaju: () => void;
      onEdit: () => void;
      onDragStart: (event: React.PointerEvent) => void;
    };

/** 누른 뒤 이만큼 움직이면 클릭이 아니라 드래그로 본다. */
const DRAG_THRESHOLD = 6;

export function TableCard(props: Props) {
  // 카드 크기와 뒤집힘 높이는 설정에서 온다. 튜너로 돌리면 여기부터 바뀐다.
  const { cardW, cardH, flipLift } = useFanConfig();

  if (props.kind === 'add') {
    return (
      <button
        type="button"
        onClick={props.onAdd}
        className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition hover:-translate-y-2"
        style={{
          width: cardW,
          height: cardH,
          borderColor: 'var(--border)',
          background: 'var(--surface-sunken)',
          color: 'var(--text-muted)',
        }}
        aria-label="카드 추가"
      >
        <span className="text-2xl leading-none">+</span>
        <span className="mt-1.5 text-[11px]">카드 추가</span>
      </button>
    );
  }

  const { profile, flipped, dimmed, onFlip, onViewSaju, onEdit, onDragStart } = props;
  const down = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);

  function handlePointerDown(event: React.PointerEvent) {
    down.current = { x: event.clientX, y: event.clientY };
    dragged.current = false;
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (!down.current || dragged.current) return;
    const dx = event.clientX - down.current.x;
    const dy = event.clientY - down.current.y;
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    // 문턱을 넘었으니 드래그로 바꾼다. 이후 클릭은 무시한다.
    dragged.current = true;
    onDragStart(event);
  }

  function handlePointerUp() {
    // 움직이지 않았으면 탭으로 보고 뒤집는다.
    if (down.current && !dragged.current) onFlip();
    down.current = null;
  }

  return (
    <div
      className="relative select-none transition-[transform,opacity] duration-300"
      style={{
        width: cardW,
        height: cardH,
        perspective: 800,
        opacity: dimmed ? 0.35 : 1,
        transform: flipped ? `translateY(-${flipLift}px)` : undefined,
        cursor: 'grab',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { down.current = null; }}
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={`${profile.label} 카드`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onFlip();
        }
      }}
    >
      <div
        className="relative size-full transition-transform duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : undefined,
        }}
      >
        {/* 앞면 — 이름만 */}
        <div
          className="table-card-face absolute inset-0 overflow-hidden rounded-xl border-2"
          style={{
            backfaceVisibility: 'hidden',
            borderColor: 'var(--border)',
            background: 'var(--card-face)',
          }}
        >
          {/*
            이름을 가운데 두면 부채꼴에서 옆 카드에 가려 안 보인다.
            트럼프 카드처럼 왼쪽 위 모서리에 둬서 겹쳐도 읽히게 한다.
          */}
          <span
            className="absolute left-2 top-2 text-[13px] font-bold leading-tight"
            style={{ maxWidth: 44, wordBreak: 'keep-all' }}
          >
            {profile.label}
          </span>
          {/* 가려지지 않는 마지막 카드에서는 가운데 이름도 함께 보인다 */}
          <span className="absolute inset-x-2 bottom-3 truncate text-center text-xs text-[var(--text-muted)]">
            {profile.label}
          </span>
        </div>

        {/* 뒷면 — 개인정보 없이 행동만 */}
        <div
          className="table-card-face absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-2.5"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderColor: 'var(--accent)',
            background: 'var(--accent-soft)',
          }}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onViewSaju(); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-full rounded-lg px-2 py-2 text-xs font-semibold text-white transition"
            style={{ background: 'var(--accent)' }}
          >
            사주보기
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-[11px] underline-offset-2 transition hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            수정
          </button>
        </div>
      </div>
    </div>
  );
}
