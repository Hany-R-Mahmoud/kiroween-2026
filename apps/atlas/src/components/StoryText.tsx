import { storyBlocks, type StoryToken } from '@kiroween/skeleton/client';
import { createContext, useContext } from 'react';
import type { Translate } from '../i18n/t';
import { splitCodes, type CodeIndex } from './sourceCodes';

/** Provided by the legend page: which source codes and chapter references can be linked. */
export const SourceCodesContext = createContext<CodeIndex | null>(null);

// Stored text is rendered as React text, italics and visible [Dramatization] labels (R4.2, R4.3); never as HTML.
function Tokens({ tokens, t }: { tokens: StoryToken[]; t: Translate }) {
  const index = useContext(SourceCodesContext);
  return tokens.map((token, i) => {
    if (token.kind === 'dramatization') {
      return (
        <span key={i} className="dramatization">
          {t('legend.dramatization')}
        </span>
      );
    }
    if (token.kind === 'em') return <em key={i}>{token.text}</em>;
    if (!index) return token.text;
    return splitCodes(token.text, index).map((seg, j) => {
      if (seg.kind === 'source') {
        const n = seg.code.slice(1);
        const title = index.sources.get(seg.id.slice('source-'.length)) ?? '';
        return (
          <a key={`${i}-${j}`} href={`#${seg.id}`} className="source-code link" aria-label={t('legend.sourceCodeName', { n, title })}>
            {seg.code}
          </a>
        );
      }
      if (seg.kind === 'chapter') {
        return (
          <a key={`${i}-${j}`} href={`#${seg.anchor}`} className="source-code link">
            {seg.code}
          </a>
        );
      }
      return seg.text;
    });
  });
}

/** A short field (a title, a claim) in one line: italics kept, no paragraphs. */
export function InlineText({ text, t }: { text: string; t: Translate }) {
  return <Tokens tokens={storyBlocks(text).flat()} t={t} />;
}

/** Story text as paragraphs. */
export function StoryText({ text, t, className = '' }: { text: string; t: Translate; className?: string }) {
  return (
    <div className={`story ${className}`}>
      {storyBlocks(text).map((block, i) => (
        <p key={i} data-block="">
          <Tokens tokens={block} t={t} />
        </p>
      ))}
    </div>
  );
}
