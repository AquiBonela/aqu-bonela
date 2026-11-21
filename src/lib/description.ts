export type DescriptionPart = { text: string; bold: boolean; italic: boolean; href?: string };

const plain = { bold: false, italic: false };

/**
 * Only paired marks are formatting: `**texto**` is bold, `*texto*` is italic.
 * `*** texto (enlace) ***` supports local paths and HTTP(S) websites.
 * Legacy `/texto*enlace/` links remain supported.
 * Links win over asterisks, marks never nest, and everything else
 * (including HTML and unpaired asterisks) stays literal text.
 */
export function parseDescription(text: string): DescriptionPart[] {
  const parts: DescriptionPart[] = [];
  const pattern = /\*\*\*([^*\n]*)\*\*\*|\/([^/*\n]+)\*([^\s*]+)\/|\*\*([^*]+)\*\*|\*([^*\n]+)\*/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const custom = match[1]?.trim().match(/^(.+?)\s*\((.+)\)$/);
    const isLink = match[1] !== undefined || match[2] !== undefined;
    const bold = match[4] !== undefined;
    const content = match[1] !== undefined ? custom?.[1]?.trim() ?? match[0] : isLink ? match[2] : bold ? match[4] : match[5];
    if (content === undefined) continue;
    if (match.index > cursor) parts.push({ text: text.slice(cursor, match.index), ...plain });
    if (isLink) {
      const href = externalTextUrl(match[1] !== undefined ? custom?.[2]?.trim() ?? '' : match[3] ?? "");
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
  if (!value || /[\s<>\\\u0000-\u001f\u007f]/.test(value) || value.startsWith("//")) return null;
  if (value.startsWith('/')) return value;
  // Recognize only existing public route names, never arbitrary bare words.
  if (/^(?:(?:servicios|comercios|profesionales|asociaciones|tramites|vida-diaria)(?:[/?#]|$)|punto-vuela(?:[/?#]|$)|servicios-publicos(?:[/?#]|$))/.test(value)) return `/${value}`;
  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(value);
  try {
    const url = new URL(hasScheme ? value : `https://${value}`);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || !url.hostname.includes(".")) return null;
    return url.href;
  } catch {
    return null;
  }
}
