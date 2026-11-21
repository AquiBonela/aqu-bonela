import { Fragment } from "react";
import { Link } from "@tanstack/react-router";
import { parseProcedureText } from "@/lib/procedure-text";

/** Receives display text only: translate before passing it, never mutate storage. */
export function ProcedureText({ text, linkPuntoVuela = true }: { text: string; linkPuntoVuela?: boolean }) {
  return <>{parseProcedureText(text, linkPuntoVuela).map((part, index) => {
    const content = part.puntoVuela
      ? <Link to="/punto-vuela" className="font-semibold text-primary underline underline-offset-2">{part.text}</Link>
      : part.text;
    return <Fragment key={index}>{part.bold ? <strong className="font-semibold">{content}</strong> : part.italic ? <em>{content}</em> : content}</Fragment>;
  })}</>;
}