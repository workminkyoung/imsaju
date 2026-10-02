import { CardTable } from '@/components/table/CardTable';

/**
 * 메인 — 카드 테이블.
 *
 * 사주와 궁합의 진입점을 한 화면으로 모았다. 카드를 누르면 뒤집혀 사주로,
 * 두 장을 위 칸에 올리면 궁합으로 간다.
 */
export default function Home() {
  return (
    <main>
      <CardTable />
    </main>
  );
}
