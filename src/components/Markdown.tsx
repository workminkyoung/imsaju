/**
 * 최소한의 마크다운 렌더러.
 *
 * LLM 출력을 그대로 HTML로 넣으면 주입 위험이 있으므로, 먼저 HTML을 전부 이스케이프한
 * 다음 우리가 허용한 문법(제목·굵게·목록·표·구분선)만 되살린다.
 * 외부 라이브러리를 쓰지 않는 이유도 같다 — 허용 범위를 코드로 못박기 위해서다.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 한 줄 안의 강조 표현만 처리한다. */
function inline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function renderTable(rows: string[]): string {
  const cells = (row: string) =>
    row.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

  const header = cells(rows[0]);
  const bodyRows = rows.slice(2).map(cells); // rows[1] 은 구분선

  const head = `<tr>${header.map((c) => `<th>${inline(c)}</th>`).join('')}</tr>`;
  const body = bodyRows
    .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
    .join('');
  return `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

function toHtml(markdown: string): string {
  const lines = markdown.split('\n');
  const out: string[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${inline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (listType && listItems.length) {
      out.push(`<${listType}>${listItems.map((i) => `<li>${inline(i)}</li>`).join('')}</${listType}>`);
    }
    listItems = [];
    listType = null;
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushAll();
      continue;
    }

    // 표: 헤더 줄 다음에 구분선이 오는 형태만 인정한다.
    if (trimmed.startsWith('|') && lines[i + 1]?.trim().match(/^\|[\s\-:|]+\|$/)) {
      flushAll();
      const rows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].trim());
        i++;
      }
      i--;
      out.push(renderTable(rows));
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushAll();
      const level = Math.min(heading[1].length + 1, 5); // 페이지 h1 과 겹치지 않게 한 단계 내린다
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    if (/^(---|\*\*\*|___)$/.test(trimmed)) {
      flushAll();
      out.push('<hr />');
      continue;
    }

    const bullet = trimmed.match(/^[-*+]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(bullet[1]);
      continue;
    }

    const numbered = trimmed.match(/^\d+\.\s+(.*)$/);
    if (numbered) {
      flushParagraph();
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(numbered[1]);
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushAll();
  return out.join('');
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: toHtml(text) }} />;
}
