export type DescriptionPart = { text: string; bold: boolean; italic: boolean };

const plain = { bold: false, italic: false };

/**
 * Only paired marks are formatting: `**texto**` is bold, `*texto*` is italic.
 * Double asterisks win over single ones, marks never nest, and everything else
 * (including HTML and unpaired asterisks) stays literal text.
 */
export function parseDescription(text: string): DescriptionPart[] {
  const parts: DescriptionPart[] = [];
  const pattern = /\*\*([^*]+)\*\*|\*([^*\n]+)\*/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const bold = match[1] !== undefined;
    const content = bold ? match[1] : match[2];
    if (content === undefined) continue;
    if (match.index > cursor) parts.push({ text: text.slice(cursor, match.index), ...plain });
    parts.push({ text: content, bold, italic: !bold });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), ...plain });
  return parts;
}
