'use client';

import { useRef } from 'react';
import type { PublicProfile } from '@/lib/profiles';
import { ELEMENTS, type Element } from '@/lib/saju/constants';

/**
 * 카드 한 장의 크기. 슬롯·드래그 고스트도 같은 값을 쓴다.
 * 앞면 배경(cardBase.png, 1065×1476)과 비율을 맞춘다.
 */
export const CARD_W = 160;
export const CARD_H = 222;

/**
 * 앞면 위 오행 색. 배경이 짙은 초록이라 UI 공통색(ELEMENT_COLOR)은 묻힌다.
 * 배경 이미지의 오행 아이콘 색에 맞춘 밝은 톤을 쓴다.
 */
const FACE_ELEMENT_COLOR: Record<Element, string> = {
  목: '#5fd18a', 화: '#ff6b6b', 토: '#e8b85a', 금: '#cfd4dc', 수: '#5aa2ff',
};

/** 배경 이미지의 오행 다섯 칸 가운데 x (%) */
const ELEMENT_COLUMN_X = [21, 36.2, 50.7, 64.8, 79.2];

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
  if (props.kind === 'add') {
    return (
      <button
        type="button"
        onClick={props.onAdd}
        className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition hover:-translate-y-2"
        style={{
          width: CARD_W,
          height: CARD_H,
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
        width: CARD_W,
        height: CARD_H,
        perspective: 800,
        opacity: dimmed ? 0.35 : 1,
        transform: flipped ? 'translateY(-26px)' : undefined,
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
        {/* 앞면 — 배경 이미지 위에 만세력 요약 */}
        <div
          className="table-card-face absolute inset-0 overflow-hidden rounded-xl"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <CardFront profile={profile} />
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

/**
 * 앞면. 배경 이미지(cardSample.png 참고)의 빈칸에 맞춰 이미지 대비 % 좌표로 배치하고,
 * 글자는 카드 폭 기준(cqw)으로 잡아 카드 크기가 바뀌어도 자리가 유지되게 한다.
 * 가운데 괄호 틀(캐릭터 자리)은 아직 비워 둔다.
 */
function CardFront({ profile }: { profile: PublicProfile }) {
  const { face } = profile;
  const max = face ? Math.max(...ELEMENTS.map((e) => face.elements[e]), 1) : 1;

  return (
    <div
      className="relative size-full select-none"
      style={{
        containerType: 'inline-size',
        background: 'var(--card-face) url(/cards/cardBase.png) center / 100% 100% no-repeat',
        imageRendering: 'pixelated',
        color: 'var(--card-ink)',
      }}
    >
      {/* 이름 — 위쪽 ✦ 사이 */}
      <span
        className="absolute truncate text-center font-bold leading-none"
        style={{ left: '33%', right: '33%', top: '11.6%', fontSize: '8cqw' }}
      >
        {profile.label}
      </span>

      {face && (
        <>
          {/* 띠·일주 — ─✦ 사이 */}
          <span
            className="absolute truncate text-center leading-none"
            style={{ left: '23%', right: '23%', top: '36.8%', fontSize: '3.8cqw', letterSpacing: '-0.02em' }}
          >
            {face.identity}
          </span>

          {/* 오행 막대 — 가장 강한 오행을 꽉 찬 막대로 */}
          {ELEMENTS.map((e, i) => (
            <span
              key={e}
              className="absolute overflow-hidden rounded-full"
              style={{
                left: `${ELEMENT_COLUMN_X[i] - 5.5}%`,
                width: '11%',
                top: '58.4%',
                height: '1.3%',
                background: 'rgb(0 0 0 / 0.4)',
              }}
              title={`${e} ${face.elements[e]}%`}
            >
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${(face.elements[e] / max) * 100}%`,
                  background: FACE_ELEMENT_COLOR[e],
                }}
              />
            </span>
          ))}

          {/* 주요 키워드 */}
          <div
            className="absolute flex flex-wrap items-center justify-center"
            style={{ left: '14%', right: '14%', top: '72.6%', bottom: '20.4%', gap: '2cqw' }}
          >
            {face.keywords.map((k) => (
              <span
                key={k.text}
                className="whitespace-nowrap leading-none"
                style={{
                  fontSize: '3.8cqw',
                  padding: '1.4cqw 2cqw',
                  border: `0.5cqw solid ${FACE_ELEMENT_COLOR[k.element]}`,
                  borderRadius: '1.5cqw',
                  color: FACE_ELEMENT_COLOR[k.element],
                }}
              >
                {k.text}
              </span>
            ))}
          </div>

          {/* 한 줄 소개 */}
          <span
            className="absolute truncate text-center leading-none"
            style={{ left: '16%', right: '16%', top: '86.4%', fontSize: '4cqw' }}
          >
            ✦ {face.tagline} ✦
          </span>
        </>
      )}
    </div>
  );
}
