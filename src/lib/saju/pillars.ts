/**
 * 사주 네 기둥(年月日時) 계산.
 *
 * 연주·월주는 절기(절대 시각)로, 일주·시주는 보정된 지방 태양시로 정한다.
 * 이 둘을 섞으면 안 된다 — 절기는 지구 어디서 보나 같은 순간이지만,
 * 날짜와 시진은 그 장소의 태양 위치를 따르기 때문이다.
 */

import {
  BRANCHES,
  BRANCHES_KO,
  BRANCH_ELEMENT,
  BRANCH_YIN_YANG,
  HIDDEN_STEMS,
  NAYIN,
  STEMS,
  STEMS_KO,
  STEM_ELEMENT,
  STEM_YIN_YANG,
  TWELVE_STAGES,
  CHANGSAENG_BRANCH,
  GENERATES,
  OVERCOMES,
  ganjiIndex,
  type Branch,
  type Element,
  type HiddenStem,
  type Stem,
  type TenGod,
  type TwelveStage,
} from './constants';
import { findMonthPeriod, sajuYear, type SolarTermInstant } from './solarTerms';
import { julianDayNumber } from './time';

/** 일주 60갑자의 기준점. 2000-01-01(율리우스적일 2451545)이 무오(戊午, 54)일이다. */
const DAY_GANJI_EPOCH_OFFSET = 49;

export interface Pillar {
  /** 60갑자 인덱스 (0~59) */
  index: number;
  stemIndex: number;
  branchIndex: number;
  stem: Stem;
  branch: Branch;
  stemKo: string;
  branchKo: string;
  /** 예: "甲子" */
  ganji: string;
  /** 예: "갑자" */
  ganjiKo: string;
  stemElement: Element;
  branchElement: Element;
  stemYinYang: '양' | '음';
  branchYinYang: '양' | '음';
  /** 지장간 */
  hiddenStems: HiddenStem[];
  nayin: string;
  /** 일간 기준 십신 (일주의 천간 자리는 '일간'으로 표기) */
  tenGodOfStem: TenGod | '일간';
  /** 지지 정기 기준 십신 */
  tenGodOfBranch: TenGod;
  /** 일간 기준 12운성 */
  twelveStage: TwelveStage;
}

/** 천간·지지 인덱스로 기둥 하나를 조립한다. dayStemIndex 가 있으면 십신·12운성까지 채운다. */
export function makePillar(
  stemIndex: number,
  branchIndex: number,
  dayStemIndex: number | null,
  isDayPillar = false,
): Pillar {
  const s = ((stemIndex % 10) + 10) % 10;
  const b = ((branchIndex % 12) + 12) % 12;
  const branch = BRANCHES[b];
  const hidden = HIDDEN_STEMS[branch];
  const mainHidden = hidden[hidden.length - 1].stem; // 정기
  const ref = dayStemIndex ?? s;

  return {
    index: ganjiIndex(s, b),
    stemIndex: s,
    branchIndex: b,
    stem: STEMS[s],
    branch,
    stemKo: STEMS_KO[s],
    branchKo: BRANCHES_KO[b],
    ganji: STEMS[s] + branch,
    ganjiKo: STEMS_KO[s] + BRANCHES_KO[b],
    stemElement: STEM_ELEMENT[s],
    branchElement: BRANCH_ELEMENT[b],
    stemYinYang: STEM_YIN_YANG[s],
    branchYinYang: BRANCH_YIN_YANG[b],
    hiddenStems: hidden,
    nayin: NAYIN[ganjiIndex(s, b)],
    tenGodOfStem: isDayPillar ? '일간' : tenGod(ref, s),
    tenGodOfBranch: tenGod(ref, STEMS.indexOf(mainHidden)),
    twelveStage: twelveStage(ref, b),
  };
}

/**
 * 십신(十神). 일간을 기준으로 상대 천간이 무엇인지 가린다.
 *
 * 오행의 생극 관계 × 음양이 같은지 다른지, 두 축으로 열 가지가 나온다.
 */
export function tenGod(dayStemIndex: number, targetStemIndex: number): TenGod {
  const me = STEM_ELEMENT[dayStemIndex];
  const target = STEM_ELEMENT[targetStemIndex];
  const same = STEM_YIN_YANG[dayStemIndex] === STEM_YIN_YANG[targetStemIndex];

  if (target === me) return same ? '비견' : '겁재';
  if (GENERATES[me] === target) return same ? '식신' : '상관';
  if (OVERCOMES[me] === target) return same ? '편재' : '정재';
  if (OVERCOMES[target] === me) return same ? '편관' : '정관';
  return same ? '편인' : '정인';
}

/**
 * 12운성(十二運星). 천간이 각 지지에서 갖는 기운의 세기.
 *
 * 양간은 장생지에서 순행, 음간은 역행한다.
 */
export function twelveStage(stemIndex: number, branchIndex: number): TwelveStage {
  const start = CHANGSAENG_BRANCH[stemIndex];
  const forward = stemIndex % 2 === 0;
  const offset = forward
    ? (branchIndex - start + 12) % 12
    : (start - branchIndex + 12) % 12;
  return TWELVE_STAGES[offset];
}

/**
 * 공망(空亡). 일주가 속한 순(旬)에서 짝을 못 얻은 두 지지.
 *
 * 천간 10개와 지지 12개를 순서대로 짝지으면 매 순마다 지지 둘이 남는다.
 */
export function voidBranches(dayGanjiIndex: number): Branch[] {
  const xunStart = Math.floor(dayGanjiIndex / 10) * 10;
  const firstBranch = xunStart % 12;
  return [BRANCHES[(firstBranch + 10) % 12], BRANCHES[(firstBranch + 11) % 12]];
}

export interface FourPillarsInput {
  /** 출생 절대 시각. 연주·월주 판정에 쓴다. */
  utc: Date;
  /** 보정된 지방 태양시(UTC인 척하는 Date). 일주·시주 판정에 쓴다. */
  localSolar: Date;
  /** true = 23시 이후를 당일 자시로 보고 일주를 넘기지 않는다(야자시 관법). */
  lateZiHour: boolean;
  /** 시각을 모르면 시주를 만들지 않는다. */
  timeKnown: boolean;
}

export interface FourPillars {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar | null;
  /** 일간 (해석의 기준점) */
  dayStemIndex: number;
  /** 사주에서의 연도 (입춘 기준) */
  sajuYear: number;
  /** 월주의 기준이 된 절기 구간 */
  monthPeriod: { current: SolarTermInstant; next: SolarTermInstant };
  /** 일주 판정에 쓴 날짜가 입력일보다 하루 넘어갔는지 */
  dayRolledOver: boolean;
  voidBranches: Branch[];
}

export function computeFourPillars(input: FourPillarsInput): FourPillars {
  const { utc, localSolar, lateZiHour, timeKnown } = input;

  // ── 연주: 입춘 기준 ──
  const year = sajuYear(utc);
  const yearGanji = ((((year - 4) % 60) + 60) % 60);
  const yearStemIndex = yearGanji % 10;

  // ── 월주: 직전 절(節)이 월지를 정하고, 연간이 월간을 정한다(오호둔) ──
  const monthPeriod = findMonthPeriod(utc);
  const monthBranchIndex = monthPeriod.current.branchIndex!;
  // 갑기년→丙寅월, 을경년→戊寅월, 병신년→庚寅월, 정임년→壬寅월, 무계년→甲寅월
  const monthStemIndex =
    ((yearStemIndex % 5) * 2 + 2 + ((monthBranchIndex - 2 + 12) % 12)) % 10;

  // ── 일주: 지방 태양시 기준의 "사주 날짜" ──
  // 23시 이후는 다음 날로 넘기는 것이 일반적인 관법. 야자시를 쓰면 넘기지 않는다.
  const solarHour = localSolar.getUTCHours();
  const dayRolledOver = timeKnown && !lateZiHour && solarHour >= 23;
  const dayReference = dayRolledOver
    ? new Date(localSolar.getTime() + 86_400_000)
    : localSolar;
  const dayGanji = (((julianDayNumber(dayReference) + DAY_GANJI_EPOCH_OFFSET) % 60) + 60) % 60;
  const dayStemIndex = dayGanji % 10;

  // ── 시주: 2시간 단위 시진 + 오자둔 ──
  let hour: Pillar | null = null;
  if (timeKnown) {
    // 23:00~00:59 가 자시. +1 하고 2로 나누면 인덱스가 된다.
    const hourBranchIndex = Math.floor(((solarHour + 1) % 24) / 2);

    // 야자시 관법에서는 23시대의 일주를 당일로 두지만, 시주는 다음 날 자시로 본다.
    // 즉 일주는 넘기지 않고 시주만 넘긴다. 이 구분을 빠뜨리면 23시대 출생만 시간이 틀어진다.
    const isLateZi = lateZiHour && solarHour >= 23;
    const hourStemBase = isLateZi ? (dayStemIndex + 1) % 10 : dayStemIndex;

    // 갑기일→甲子시, 을경일→丙子시, 병신일→戊子시, 정임일→庚子시, 무계일→壬子시
    const hourStemIndex = ((hourStemBase % 5) * 2 + hourBranchIndex) % 10;
    hour = makePillar(hourStemIndex, hourBranchIndex, dayStemIndex);
  }

  return {
    year: makePillar(yearStemIndex, yearGanji % 12, dayStemIndex),
    month: makePillar(monthStemIndex, monthBranchIndex, dayStemIndex),
    day: makePillar(dayStemIndex, dayGanji % 12, dayStemIndex, true),
    hour,
    dayStemIndex,
    sajuYear: year,
    monthPeriod,
    dayRolledOver,
    voidBranches: voidBranches(dayGanji),
  };
}
