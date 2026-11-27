/** Preserve business numbers, markup structure and destinations before accepting an AI result. */
export function validateTranslatedStrings(source: string[], result: string[]): void {
  if (source.length !== result.length)
    throw new Error("La traducción está incompleta. No se ha guardado.");
  source.forEach((text, index) => {
    const translated = result[index];
    if (typeof translated !== "string" || !translated.trim())
      throw new Error("La traducción contiene un texto vacío.");
    const originalNumbers = text.match(/\d+(?:[.,:/-]\d+)*/g) ?? [];
    const targetNumbers = translated.match(/\d+(?:[.,:/-]\d+)*/g) ?? [];
    if (
      originalNumbers.length !== targetNumbers.length ||
      originalNumbers.some((n, i) => n !== targetNumbers[i])
    )
      throw new Error("La traducción ha cambiado algún número. Revisa el texto original.");
    const destinations = [...text.matchAll(/\/[^/\n]*\*([^\s]+?)\/(?=\s|[.,;!?)]|$)/g)].map(
      (m) => m[1],
    );
    if (destinations.some((url) => url && !translated.includes(url)))
      throw new Error("La traducción ha cambiado un enlace.");
    if ((text.match(/\*/g) ?? []).length !== (translated.match(/\*/g) ?? []).length)
      throw new Error("La traducción ha cambiado el formato del texto.");
    if (text.split("\n").length !== translated.split("\n").length)
      throw new Error("La traducción ha cambiado los párrafos.");
  });
}
