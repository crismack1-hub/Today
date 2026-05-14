import type { ReactNode } from 'react';

const URL_RE = /(https?:\/\/[^\s<>"')]+)/gi;

export function linkify(text: string | undefined | null): ReactNode {
  if (!text) return null;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  while ((m = URL_RE.exec(text)) !== null) {
    if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index));
    const url = m[0];
    parts.push(
      <a
        key={`${m.index}-${url}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="underline decoration-dotted underline-offset-2 hover:opacity-80"
        style={{ color: 'var(--accent)' }}
      >
        {url}
      </a>,
    );
    lastIndex = m.index + url.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export function firstUrl(text: string | undefined | null): string | null {
  if (!text) return null;
  URL_RE.lastIndex = 0;
  const m = URL_RE.exec(text);
  return m ? m[0] : null;
}
