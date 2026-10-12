import type { ReactNode } from "react";

interface RichTextProps {
  text: string;
  className?: string;
}

function parseInline(text: string, keyPrefix: string): ReactNode[] {
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[1] !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-b-${i++}`} className="font-semibold text-white">{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      nodes.push(<em key={`${keyPrefix}-i-${i++}`} className="italic">{match[2]}</em>);
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

const BULLET_RE = /^\s*[-*]\s+(.*)$/;

export function RichText({ text, className = "" }: RichTextProps) {
  if (!text) return null;
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let paragraphBuf: string[] = [];
  let bulletBuf: string[] = [];
  let blockKey = 0;

  const flushParagraph = () => {
    if (paragraphBuf.length === 0) return;
    const joined = paragraphBuf.join(" ").trim();
    if (joined) {
      blocks.push(
        <p key={`p-${blockKey++}`} className="text-sm text-slate-300 leading-relaxed">
          {parseInline(joined, `p${blockKey}`)}
        </p>
      );
    }
    paragraphBuf = [];
  };

  const flushBullets = () => {
    if (bulletBuf.length === 0) return;
    const items = bulletBuf;
    bulletBuf = [];
    blocks.push(
      <ul key={`ul-${blockKey++}`} className="space-y-1 pl-1">
        {items.map((item, idx) => (
          <li key={`li-${blockKey}-${idx}`} className="text-sm text-slate-300 leading-relaxed flex gap-2">
            <span className="text-slate-500 select-none">\u2022</span>
            <span>{parseInline(item, `li${blockKey}-${idx}`)}</span>
          </li>
        ))}
      </ul>
    );
  };

  for (const rawLine of lines) {
    const bulletMatch = BULLET_RE.exec(rawLine);
    if (bulletMatch) {
      flushParagraph();
      bulletBuf.push(bulletMatch[1]);
    } else if (rawLine.trim() === "") {
      flushParagraph();
      flushBullets();
    } else {
      flushBullets();
      paragraphBuf.push(rawLine.trim());
    }
  }
  flushParagraph();
  flushBullets();

  return <div className={`space-y-2 ${className}`}>{blocks}</div>;
}
