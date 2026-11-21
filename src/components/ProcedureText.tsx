import { FormattedTextPart } from "@/components/FormattedText";
import { Link } from "@tanstack/react-router";
import { parseProcedureText } from "@/lib/procedure-text";

/** Receives display text only: translate before passing it, never mutate storage. */
export function ProcedureText({ text, linkPuntoVuela = true }: { text: string; linkPuntoVuela?: boolean }) {
  return <span className="whitespace-pre-line">{parseProcedureText(text, linkPuntoVuela).map((part, index) => {
    const content = part.puntoVuela
      ? <Link to="/punto-vuela" className="font-semibold text-primary underline underline-offset-2">{part.text}</Link>
      : part.text;
    return <FormattedTextPart key={index} part={part} linksEnabled={linkPuntoVuela}>{content}</FormattedTextPart>;
  })}</span>;
}