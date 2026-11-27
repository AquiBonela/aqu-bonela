/**
 * Caracteres de control C0 (U+0000 a U+001F) y DEL (U+007F).
 * Se comprueban por código y no con una expresión regular, que tendría que contener esos caracteres.
 */
export function hasControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}
