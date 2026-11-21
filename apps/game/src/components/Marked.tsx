import { inlineMarks } from '@kiroween/skeleton/client';

/**
 * Content text with its `*italic*` marks drawn as <em>. Text is React text, never HTML. For accessible names, alt text
 * and aria strings use `stripMarks` instead, so no asterisk is read out.
 */
export function Marked({ text }: { text: string }) {
  return (
    <>
      {inlineMarks(text).map((token, i) =>
        token.kind === 'em' ? <em key={i}>{token.text}</em> : token.kind === 'text' ? token.text : null,
      )}
    </>
  );
}
