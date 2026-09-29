/** 만세력 계산의 입출력 형태. 화면과 LLM 프롬프트가 같은 객체를 쓴다. */

import type { ChartAnalysis } from './analyze';
import type { Branch } from './constants';
import type { DaeunEntry, Gender, LuckCycles, SeunEntry } from './luck';
import type { Pillar } from './pillars';
import type { SolarTimeMode } from './time';

export interface SajuInput {
  name: string;
  /** 입력한 날짜가 양력인지 음력인지 */
  calendar: 'solar' | 'lunar';
  year: number;
  month: number;
  day: number;
  /** 음력이고 윤달이면 true */
  isLeapMonth?: boolean;
  /** 시각을 모르면 true. 이때 시주는 만들지 않는다. */
  timeUnknown?: boolean;
  hour?: number;
  minute?: number;
  gender: Gender;
  /** 도시 프리셋 이름. 없으면 longitude/timeZone 을 직접 준다. */
  city?: string;
  longitude?: number;
  timeZone?: string;
  /** 진태양시 보정 방식 */
  solarTimeMode?: SolarTimeMode;
  /** 야자시 관법 사용 여부 */
  lateZiHour?: boolean;
}

/**
 * 계산 근거. 이 값들을 화면에 그대로 공개하는 것이 이 서비스의 신빙성 근거다.
 */
export interface CalculationBasis {
  /** 사용자가 입력한 그대로 */
  inputSummary: string;
  /** 음력 입력이었다면 변환된 양력 날짜 */
  convertedSolarDate?: string;
  /** 양력 입력이었다면 대응하는 음력 날짜 */
  lunarDate?: string;
  place: { name: string; longitude: number; timeZone: string };
  /** 출생 당시 적용된 UTC 오프셋 */
  offsetLabel: string;
  isDaylightSaving: boolean;
  /** 존재하지 않는 벽시계 시각이었다면 경고 */
  nonexistentLocalTime: boolean;
  /** 절대 시각 (UTC) */
  utcInstant: string;
  solarTimeMode: SolarTimeMode;
  /** 표준시 대비 총 보정 (분) */
  totalCorrectionMinutes: number;
  longitudeCorrectionMinutes: number;
  equationOfTimeMinutes: number;
  /** 보정 후 실제로 시주 판정에 쓴 시각 */
  correctedLocalTime: string;
  /** 월주 기준이 된 절기 구간 */
  monthTerm: { name: string; startKst: string; endName: string; endKst: string };
  /** 연주 기준 입춘 */
  ipchunKst: string;
  lateZiHour: boolean;
  /** 23시 이후라 일주를 다음 날로 넘겼는지 */
  dayRolledOver: boolean;
}

export interface SajuChart {
  input: SajuInput;
  /** 사주에서의 연도 (입춘 기준) */
  sajuYear: number;
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar | null;
  };
  /** 해석의 기준점 */
  dayMaster: {
    stem: string;
    stemKo: string;
    element: string;
    yinYang: '양' | '음';
  };
  voidBranches: Branch[];
  zodiac: string;
  analysis: ChartAnalysis;
  daeun: LuckCycles;
  seun: SeunEntry[];
  basis: CalculationBasis;
}

export type { DaeunEntry, Gender, LuckCycles, Pillar, SeunEntry, SolarTimeMode };
