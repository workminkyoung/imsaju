import { CardTable } from '@/components/table/CardTable';

/**
 * 메인 — 카드 테이블.
 *
 * 사주와 궁합의 진입점을 한 화면으로 모았다. 카드를 누르면 뒤집혀 사주로,
 * 두 장을 위 칸에 올리면 궁합으로 간다. 남은 높이를 모두 넘겨 카드가 화면
 * 아래 끝까지 깔리게 한다.
 */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <CardTable />
    </main>
  );
}
