export type DescriptionPart = { text: string; bold: boolean };

/** Only paired double asterisks are formatting; all other content stays plain text. */
export function parseDescription(text: string): DescriptionPart[] {
  const parts: DescriptionPart[] = [];
  const pattern = /\*\*([^*]+)\*\*/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const content = match[1];
    if (content === undefined) continue;
    if (match.index > cursor) parts.push({ text: text.slice(cursor, match.index), bold: false });
    parts.push({ text: content, bold: true });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), bold: false });
  return parts;
}