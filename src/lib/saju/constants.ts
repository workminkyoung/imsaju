/**
 * 명리(命理) 기본 상수 테이블.
 *
 * 이 파일의 표는 전부 전통 명리학에서 고정된 값이다. 계산으로 유도하지 않고
 * 표로 박아두는 편이 검증하기 쉽다.
 */

// ── 천간(天干) ────────────────────────────────────────────────────────────
export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export const STEMS_KO = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;

// ── 지지(地支) ────────────────────────────────────────────────────────────
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
export const BRANCHES_KO = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'] as const;

/** 지지별 띠 */
export const ZODIAC_KO = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'] as const;

export type Stem = (typeof STEMS)[number];
export type Branch = (typeof BRANCHES)[number];

// ── 오행(五行) ────────────────────────────────────────────────────────────
export const ELEMENTS = ['목', '화', '토', '금', '수'] as const;
export type Element = (typeof ELEMENTS)[number];

/** 천간의 오행. 갑을=목, 병정=화, 무기=토, 경신=금, 임계=수 */
export const STEM_ELEMENT: readonly Element[] = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수'];

/** 지지의 오행. 진술축미는 토. */
export const BRANCH_ELEMENT: readonly Element[] = [
  '수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수',
];

/** 천간의 음양. 짝수 인덱스(갑·병·무·경·임)가 양(陽). */
export const STEM_YIN_YANG: readonly ('양' | '음')[] = STEMS.map((_, i) => (i % 2 === 0 ? '양' : '음'));

/** 지지의 음양. 자·인·진·오·신·술이 양. */
export const BRANCH_YIN_YANG: readonly ('양' | '음')[] = BRANCHES.map((_, i) => (i % 2 === 0 ? '양' : '음'));

/** 오행 상생: 목→화→토→금→수→목 */
export const GENERATES: Record<Element, Element> = {
  목: '화', 화: '토', 토: '금', 금: '수', 수: '목',
};

/** 오행 상극: 목→토→수→화→금→목 */
export const OVERCOMES: Record<Element, Element> = {
  목: '토', 토: '수', 수: '화', 화: '금', 금: '목',
};

/** 오행별 표시 색 (UI 공통) */
export const ELEMENT_COLOR: Record<Element, string> = {
  목: '#2f9e5e', 화: '#d64545', 토: '#b08340', 금: '#8a8f98', 수: '#2f6fb0',
};

// ── 지장간(支藏干) ────────────────────────────────────────────────────────
/**
 * 지지 속에 숨은 천간. [여기(餘氣), 중기(中氣), 정기(正氣)] 순.
 * days 는 월률분야(月律分野) 일수로, 지장간 가중치 계산에 쓴다.
 */
export interface HiddenStem {
  stem: Stem;
  role: '여기' | '중기' | '정기';
  days: number;
}

export const HIDDEN_STEMS: Record<Branch, HiddenStem[]> = {
  子: [{ stem: '壬', role: '여기', days: 10 }, { stem: '癸', role: '정기', days: 20 }],
  丑: [{ stem: '癸', role: '여기', days: 9 }, { stem: '辛', role: '중기', days: 3 }, { stem: '己', role: '정기', days: 18 }],
  寅: [{ stem: '戊', role: '여기', days: 7 }, { stem: '丙', role: '중기', days: 7 }, { stem: '甲', role: '정기', days: 16 }],
  卯: [{ stem: '甲', role: '여기', days: 10 }, { stem: '乙', role: '정기', days: 20 }],
  辰: [{ stem: '乙', role: '여기', days: 9 }, { stem: '癸', role: '중기', days: 3 }, { stem: '戊', role: '정기', days: 18 }],
  巳: [{ stem: '戊', role: '여기', days: 7 }, { stem: '庚', role: '중기', days: 7 }, { stem: '丙', role: '정기', days: 16 }],
  午: [{ stem: '丙', role: '여기', days: 10 }, { stem: '己', role: '중기', days: 9 }, { stem: '丁', role: '정기', days: 11 }],
  未: [{ stem: '丁', role: '여기', days: 9 }, { stem: '乙', role: '중기', days: 3 }, { stem: '己', role: '정기', days: 18 }],
  申: [{ stem: '戊', role: '여기', days: 7 }, { stem: '壬', role: '중기', days: 7 }, { stem: '庚', role: '정기', days: 16 }],
  酉: [{ stem: '庚', role: '여기', days: 10 }, { stem: '辛', role: '정기', days: 20 }],
  戌: [{ stem: '辛', role: '여기', days: 9 }, { stem: '丁', role: '중기', days: 3 }, { stem: '戊', role: '정기', days: 18 }],
  亥: [{ stem: '戊', role: '여기', days: 7 }, { stem: '甲', role: '중기', days: 7 }, { stem: '壬', role: '정기', days: 16 }],
};

// ── 십신(十神) ────────────────────────────────────────────────────────────
export const TEN_GODS = [
  '비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인',
] as const;
export type TenGod = (typeof TEN_GODS)[number];

/** 십신 요약 설명 (UI 툴팁·LLM 프롬프트용) */
export const TEN_GOD_MEANING: Record<TenGod, string> = {
  비견: '나와 같은 오행·같은 음양. 자립·경쟁·동료.',
  겁재: '나와 같은 오행·다른 음양. 경쟁·분탈·추진.',
  식신: '내가 생하는 오행·같은 음양. 표현·연구·여유.',
  상관: '내가 생하는 오행·다른 음양. 재능·표출·반골.',
  편재: '내가 극하는 오행·같은 음양. 유동자산·활동성.',
  정재: '내가 극하는 오행·다른 음양. 고정자산·성실.',
  편관: '나를 극하는 오행·같은 음양. 압박·결단·권위(칠살).',
  정관: '나를 극하는 오행·다른 음양. 규범·명예·조직.',
  편인: '나를 생하는 오행·같은 음양. 직관·비주류 학문.',
  정인: '나를 생하는 오행·다른 음양. 학문·보호·문서.',
};

// ── 12운성(十二運星) ──────────────────────────────────────────────────────
export const TWELVE_STAGES = [
  '장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양',
] as const;
export type TwelveStage = (typeof TWELVE_STAGES)[number];

/**
 * 천간별 장생(長生) 지지의 인덱스.
 * 양간은 순행, 음간은 역행으로 12운성을 돈다.
 */
export const CHANGSAENG_BRANCH: readonly number[] = [
  11, // 甲 → 亥
  6, //  乙 → 午
  2, //  丙 → 寅
  9, //  丁 → 酉
  2, //  戊 → 寅 (병과 동행)
  9, //  己 → 酉 (정과 동행)
  5, //  庚 → 巳
  0, //  辛 → 子
  8, //  壬 → 申
  3, //  癸 → 卯
];

// ── 납음오행(納音五行) ────────────────────────────────────────────────────
/** 60갑자 순서대로의 납음. 갑자·을축이 해중금(海中金) … */
export const NAYIN: readonly string[] = [
  '해중금', '해중금', '노중화', '노중화', '대림목', '대림목',
  '노방토', '노방토', '검봉금', '검봉금', '산두화', '산두화',
  '간하수', '간하수', '성두토', '성두토', '백랍금', '백랍금',
  '양류목', '양류목', '천중수', '천중수', '옥상토', '옥상토',
  '벽력화', '벽력화', '송백목', '송백목', '장류수', '장류수',
  '사중금', '사중금', '산하화', '산하화', '평지목', '평지목',
  '벽상토', '벽상토', '금박금', '금박금', '복등화', '복등화',
  '천하수', '천하수', '대역토', '대역토', '차천금', '차천금',
  '상자목', '상자목', '대계수', '대계수', '사중토', '사중토',
  '천상화', '천상화', '석류목', '석류목', '대해수', '대해수',
];

// ── 24절기 ────────────────────────────────────────────────────────────────
/** 절기 이름과 태양 황경(도). 절(節)은 월의 시작, 기(氣)는 월의 중간. */
export interface SolarTermDef {
  name: string;
  longitude: number;
  /** true = 절(節), 월주 경계가 된다. false = 기(氣). */
  isMonthBoundary: boolean;
  /** 이 절부터 시작되는 월지 인덱스 (절일 때만) */
  branchIndex?: number;
}

export const SOLAR_TERMS: readonly SolarTermDef[] = [
  { name: '입춘', longitude: 315, isMonthBoundary: true, branchIndex: 2 }, //  寅
  { name: '우수', longitude: 330, isMonthBoundary: false },
  { name: '경칩', longitude: 345, isMonthBoundary: true, branchIndex: 3 }, //  卯
  { name: '춘분', longitude: 0, isMonthBoundary: false },
  { name: '청명', longitude: 15, isMonthBoundary: true, branchIndex: 4 }, //   辰
  { name: '곡우', longitude: 30, isMonthBoundary: false },
  { name: '입하', longitude: 45, isMonthBoundary: true, branchIndex: 5 }, //   巳
  { name: '소만', longitude: 60, isMonthBoundary: false },
  { name: '망종', longitude: 75, isMonthBoundary: true, branchIndex: 6 }, //   午
  { name: '하지', longitude: 90, isMonthBoundary: false },
  { name: '소서', longitude: 105, isMonthBoundary: true, branchIndex: 7 }, //  未
  { name: '대서', longitude: 120, isMonthBoundary: false },
  { name: '입추', longitude: 135, isMonthBoundary: true, branchIndex: 8 }, //  申
  { name: '처서', longitude: 150, isMonthBoundary: false },
  { name: '백로', longitude: 165, isMonthBoundary: true, branchIndex: 9 }, //  酉
  { name: '추분', longitude: 180, isMonthBoundary: false },
  { name: '한로', longitude: 195, isMonthBoundary: true, branchIndex: 10 }, // 戌
  { name: '상강', longitude: 210, isMonthBoundary: false },
  { name: '입동', longitude: 225, isMonthBoundary: true, branchIndex: 11 }, // 亥
  { name: '소설', longitude: 240, isMonthBoundary: false },
  { name: '대설', longitude: 255, isMonthBoundary: true, branchIndex: 0 }, //  子
  { name: '동지', longitude: 270, isMonthBoundary: false },
  { name: '소한', longitude: 285, isMonthBoundary: true, branchIndex: 1 }, //  丑
  { name: '대한', longitude: 300, isMonthBoundary: false },
];

// ── 헬퍼 ──────────────────────────────────────────────────────────────────

/** 60갑자 인덱스 → 간지 문자열 (예: 0 → 甲子) */
export function ganjiOf(index: number): string {
  const i = ((index % 60) + 60) % 60;
  return STEMS[i % 10] + BRANCHES[i % 12];
}

/** 60갑자 인덱스 → 한글 간지 (예: 0 → 갑자) */
export function ganjiKoOf(index: number): string {
  const i = ((index % 60) + 60) % 60;
  return STEMS_KO[i % 10] + BRANCHES_KO[i % 12];
}

/** 천간·지지 인덱스 → 60갑자 인덱스. 불가능한 조합이면 -1. */
export function ganjiIndex(stemIndex: number, branchIndex: number): number {
  const s = ((stemIndex % 10) + 10) % 10;
  const b = ((branchIndex % 12) + 12) % 12;
  for (let i = 0; i < 60; i++) {
    if (i % 10 === s && i % 12 === b) return i;
  }
  return -1;
}
