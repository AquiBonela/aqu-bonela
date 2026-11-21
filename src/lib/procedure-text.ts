import { parseDescription, type DescriptionPart } from "./description";

export type ProcedureTextPart = DescriptionPart & { puntoVuela: boolean };

/** Detect the existing internal link after formatting, preserving emphasis. */
export function parseProcedureText(text: string, linkPuntoVuela = true): ProcedureTextPart[] {
  return parseDescription(text).flatMap((part) =>
    (linkPuntoVuela ? part.text.split(/(Punto Vuela)/g) : [part.text])
      .filter(Boolean)
      .map((text) => ({ ...part, text, puntoVuela: linkPuntoVuela && text === "Punto Vuela" })),
  );
}