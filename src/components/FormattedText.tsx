import type { ReactNode } from "react";
import { parseDescription, type DescriptionPart } from "@/lib/description";

export function FormattedTextPart({ part, linksEnabled = true, children }: { part: DescriptionPart; linksEnabled?: boolean; children?: ReactNode }) {
  const content = part.href && linksEnabled
    ? <a href={part.href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">{part.text}</a>
    : children ?? part.text;
  return part.bold ? <strong className="font-semibold">{content}</strong> : part.italic ? <em>{content}</em> : <>{content}</>;
}

export function FormattedText({ text }: { text: string }) {
  return <>{parseDescription(text).map((part, index) => <FormattedTextPart key={index} part={part} />)}</>;
}