export type DescriptionPart = { text: string; bold: boolean; italic: boolean; href?: string };

const plain = { bold: false, italic: false };

/**
 * Only paired marks are formatting: `**texto**` is bold, `*texto*` is italic.
 * `/texto*enlace/` creates an HTTP(S) link, adding https:// to bare domains.
 * Links win over asterisks, marks never nest, and everything else
 * (including HTML and unpaired asterisks) stays literal text.
 */
export function parseDescription(text: string): DescriptionPart[] {
  const parts: DescriptionPart[] = [];
  const pattern = /\/([^/*\n]+)\*([^\s*]+)\/|\*\*([^*]+)\*\*|\*([^*\n]+)\*/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const isLink = match[1] !== undefined;
    const bold = match[3] !== undefined;
    const content = isLink ? match[1] : bold ? match[3] : match[4];
    if (content === undefined) continue;
    if (match.index > cursor) parts.push({ text: text.slice(cursor, match.index), ...plain });
    if (isLink) {
      const href = externalTextUrl(match[2] ?? "");
      parts.push(href ? { text: content, ...plain, href } : { text: match[0], ...plain });
    } else {
      parts.push({ text: content, bold, italic: !bold });
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), ...plain });
  return parts;
}

/** Only browser navigation to ordinary websites; never HTML or executable schemes. */
export function externalTextUrl(value: string): string | null {
  if (/[\s<>\\\u0000-\u001f\u007f]/.test(value) || value.startsWith("//")) return null;
  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(value);
  try {
    const url = new URL(hasScheme ? value : `https://${value}`);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || !url.hostname.includes(".")) return null;
    return url.href;
  } catch {
    return null;
  }
}
