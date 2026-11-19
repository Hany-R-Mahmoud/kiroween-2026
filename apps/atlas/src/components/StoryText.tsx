import { storyBlocks, type StoryToken } from '@kiroween/skeleton/client';
import type { Translate } from '../i18n/t';

// Stored text is rendered as React text, italics and visible [Dramatization] labels (R4.2, R4.3); never as HTML.
function Tokens({ tokens, t }: { tokens: StoryToken[]; t: Translate }) {
  return tokens.map((token, i) =>
    token.kind === 'dramatization' ? (
      <span key={i} className="dramatization">
        {t('legend.dramatization')}
      </span>
    ) : token.kind === 'em' ? (
      <em key={i}>{token.text}</em>
    ) : (
      token.text
    ),
  );
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
        <p key={i}>
          <Tokens tokens={block} t={t} />
        </p>
      ))}
    </div>
  );
}
