import { FormattedTextPart } from "@/components/FormattedText";
import { parseProcedureText } from "@/lib/procedure-text";

/** Receives display text only: translate before passing it, never mutate storage. */
export function ProcedureText({
  text,
  linkPuntoVuela = true,
}: {
  text: string;
  linkPuntoVuela?: boolean;
}) {
  return (
    <span className="whitespace-pre-line">
      {parseProcedureText(text).map((part, index) => (
        <FormattedTextPart key={index} part={part} linksEnabled={linkPuntoVuela} />
      ))}
    </span>
  );
}
