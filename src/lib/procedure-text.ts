import { parseDescription, type DescriptionPart } from "./description";

export type ProcedureTextPart = DescriptionPart & { puntoVuela: boolean };

/** Only explicit formatting creates links; keep the legacy call signature compatible. */
export function parseProcedureText(text: string, _linksEnabled = true): ProcedureTextPart[] {
  return parseDescription(text).map((part) => ({ ...part, puntoVuela: false }));
}
