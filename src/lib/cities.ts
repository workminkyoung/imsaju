/**
 * 출생지 프리셋.
 *
 * 경도는 진태양시 보정에, 타임존은 그 시절의 표준시·서머타임을 되살리는 데 쓴다.
 * 해외 도시도 몇 곳 넣어 두되, 목록에 없으면 경도를 직접 입력할 수 있게 한다.
 */

export interface City {
  name: string;
  longitude: number;
  timeZone: string;
  group: '국내' | '해외';
}

export const CITIES: City[] = [
  // 경도 큰 순(동쪽)부터. 동쪽일수록 표준시와의 차이가 작다.
  { name: '서울', longitude: 126.9784, timeZone: 'Asia/Seoul', group: '국내' },
  { name: '인천', longitude: 126.7052, timeZone: 'Asia/Seoul', group: '국내' },
  { name: '수원', longitude: 127.0286, timeZone: 'Asia/Seoul', group: '국내' },
  { name: '춘천', longitude: 127.7298, timeZone: 'Asia/Seoul', group: '국내' },
  { name: '강릉', longitude: 128.8961, timeZone: 'Asia/Seoul', group: '국내' },
  { name: '대전', longitude: 127.3845, timeZone: 'Asia/Seoul', group: '국내' },
  { name: '청주', longitude: 127.4890, timeZone: 'Asia/Seoul', group: '국내' },
  { name: '전주', longitude: 127.1480, timeZone: 'Asia/Seoul', group: '국내' },
  { name: '광주', longitude: 126.8526, timeZone: 'Asia/Seoul', group: '국내' },
  { name: '목포', longitude: 126.3922, timeZone: 'Asia/Seoul', group: '국내' },
  { name: '대구', longitude: 128.6014, timeZone: 'Asia/Seoul', group: '국내' },
  { name: '포항', longitude: 129.3650, timeZone: 'Asia/Seoul', group: '국내' },
  { name: '부산', longitude: 129.0756, timeZone: 'Asia/Seoul', group: '국내' },
  { name: '울산', longitude: 129.3114, timeZone: 'Asia/Seoul', group: '국내' },
  { name: '창원', longitude: 128.6811, timeZone: 'Asia/Seoul', group: '국내' },
  { name: '제주', longitude: 126.5312, timeZone: 'Asia/Seoul', group: '국내' },
  { name: '평양', longitude: 125.7381, timeZone: 'Asia/Pyongyang', group: '국내' },

  { name: '도쿄', longitude: 139.6917, timeZone: 'Asia/Tokyo', group: '해외' },
  { name: '오사카', longitude: 135.5023, timeZone: 'Asia/Tokyo', group: '해외' },
  { name: '베이징', longitude: 116.4074, timeZone: 'Asia/Shanghai', group: '해외' },
  { name: '상하이', longitude: 121.4737, timeZone: 'Asia/Shanghai', group: '해외' },
  { name: '홍콩', longitude: 114.1694, timeZone: 'Asia/Hong_Kong', group: '해외' },
  { name: '타이베이', longitude: 121.5654, timeZone: 'Asia/Taipei', group: '해외' },
  { name: '싱가포르', longitude: 103.8198, timeZone: 'Asia/Singapore', group: '해외' },
  { name: '하노이', longitude: 105.8342, timeZone: 'Asia/Ho_Chi_Minh', group: '해외' },
  { name: '시드니', longitude: 151.2093, timeZone: 'Australia/Sydney', group: '해외' },
  { name: '로스앤젤레스', longitude: -118.2437, timeZone: 'America/Los_Angeles', group: '해외' },
  { name: '뉴욕', longitude: -74.006, timeZone: 'America/New_York', group: '해외' },
  { name: '토론토', longitude: -79.3832, timeZone: 'America/Toronto', group: '해외' },
  { name: '런던', longitude: -0.1276, timeZone: 'Europe/London', group: '해외' },
  { name: '파리', longitude: 2.3522, timeZone: 'Europe/Paris', group: '해외' },
  { name: '베를린', longitude: 13.405, timeZone: 'Europe/Berlin', group: '해외' },
];

export const DEFAULT_CITY = CITIES[0];

export function findCity(name: string): City | undefined {
  return CITIES.find((c) => c.name === name);
}
