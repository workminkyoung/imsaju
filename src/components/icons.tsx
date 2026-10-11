/**
 * 사주 화면의 작은 선 아이콘들.
 *
 * 글자만 늘어놓으면 어느 칸이 무엇인지 훑어서 찾기 어렵다. 제목 옆에 같은 굵기의
 * 선 아이콘을 두어 눈이 먼저 걸리게 한다. 색은 물려받아(currentColor) 쓰는 곳에서 정한다.
 */

type Props = { className?: string; style?: React.CSSProperties };

const base = 'size-[18px] shrink-0';

function Svg({ className, style, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? base}
      style={style}
    >
      {children}
    </svg>
  );
}

/** 원국 — 네 기둥 */
export function IconPillars({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M4 5v14M9.333 5v14M14.667 5v14M20 5v14" />
      <path d="M3 9.5h18M3 14.5h18" opacity="0.5" />
    </Svg>
  );
}

/** 오행 — 다섯 기운이 도는 고리 */
export function IconElements({ className }: Props) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="4.6" r="1.7" />
      <circle cx="19" cy="9.8" r="1.7" />
      <circle cx="16.4" cy="18.2" r="1.7" />
      <circle cx="7.6" cy="18.2" r="1.7" />
      <circle cx="5" cy="9.8" r="1.7" />
      <path d="M12 6.3 16.4 16.5M16.4 16.5 5.9 10.6M5.9 10.6 18.1 10.6M18.1 10.6 7.6 16.5M7.6 16.5 12 6.3" opacity="0.55" />
    </Svg>
  );
}

/** 십신 — 나를 가운데 둔 관계 */
export function IconTenGods({ className }: Props) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="2.6" />
      <path d="M12 3v3.2M12 17.8V21M3 12h3.2M17.8 12H21" />
      <path d="M5.6 5.6 7.9 7.9M16.1 16.1l2.3 2.3M18.4 5.6 16.1 7.9M7.9 16.1l-2.3 2.3" opacity="0.55" />
    </Svg>
  );
}

/** 대운·세운 — 시기 */
export function IconLuck({ className }: Props) {
  return (
    <Svg className={className}>
      <rect x="3.2" y="5" width="17.6" height="15.5" rx="2.2" />
      <path d="M3.2 10h17.6M8 3v4M16 3v4" />
      <path d="M7.4 14h2.2M14.4 14h2.2" opacity="0.6" />
    </Svg>
  );
}

/** 사주풀이 — 두루마리 */
export function IconScroll({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M6.5 3.5h10a2 2 0 0 1 2 2v13a2 2 0 0 0 2 2H7.5a2 2 0 0 1-2-2V5.5" />
      <path d="M5.5 5.5a2 2 0 1 0-4 0c0 1.1.9 2 2 2h2" />
      <path d="M9 8.5h6.5M9 12h6.5M9 15.5h4" opacity="0.6" />
    </Svg>
  );
}

/** 머리띠 양 끝과 제목 앞에 놓는 마름모 */
export function IconDiamond({ className, style }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? base}
      style={style}
    >
      <path d="M12 2.8 21.2 12 12 21.2 2.8 12z" />
      <path d="M12 7.6 16.4 12 12 16.4 7.6 12z" opacity="0.6" />
    </svg>
  );
}
