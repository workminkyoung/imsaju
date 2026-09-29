/**
 * lunar-javascript 는 타입 선언을 제공하지 않는다.
 * 이 라이브러리는 교차검증 테스트에서만 쓰므로, 테스트가 실제로 호출하는
 * 최소한의 표면만 선언한다. (프로덕션 번들에는 포함되지 않는다.)
 */
declare module 'lunar-javascript' {
  interface DaYun {
    getStartYear(): number;
    getStartAge(): number;
    getGanZhi(): string;
  }

  interface Yun {
    isForward(): boolean;
    getStartYear(): number;
    getStartMonth(): number;
    getStartDay(): number;
    getDaYun(n?: number): DaYun[];
  }

  interface EightChar {
    setSect(sect: number): void;
    getSect(): number;
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    getTime(): string;
    /** gender: 1 = 남자, 0 = 여자. sect 2 = 분 단위 정밀 계산. */
    getYun(gender: number, sect?: number): Yun;
  }

  interface JieQi {
    toYmdHms(): string;
  }

  interface Lunar {
    getEightChar(): EightChar;
    getJieQiTable(): Record<string, JieQi>;
  }

  interface SolarDate {
    getLunar(): Lunar;
  }

  export const Solar: {
    fromYmd(year: number, month: number, day: number): SolarDate;
    fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number,
    ): SolarDate;
  };
}
