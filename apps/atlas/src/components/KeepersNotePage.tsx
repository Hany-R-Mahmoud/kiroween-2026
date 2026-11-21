import type { KeepersNoteView } from '@kiroween/skeleton/client';
import { Book } from '@kiroween/skeleton/book';
import type { Translate } from '../i18n/t';
import { bookLabels } from './bookLabels';
import { InlineText, StoryText } from './StoryText';

/**
 * The Keeper's Note (R3.4): title, the stored fiction label, and one chapter whose section carries the anchor id exactly
 * once. It is not a legend: no map, no list, no versions. The text is the stored text, rendered as React text.
 */
export function KeepersNotePage({ note, t }: { note: KeepersNoteView; t: Translate }) {
  const headingId = `${note.anchor}-title`;
  return (
    <article aria-labelledby="note-title" className="flex flex-col gap-10 px-4 pb-16 pt-8">
      {/* The Fiction label sits above the book, outside the paginated flow, so it is always visible (19.12). */}
      <header className="measure mx-auto flex w-full flex-col gap-3">
        <p className="font-ui text-sm text-muted">{note.label}</p>
        <h1 id="note-title" className="text-4xl text-glow sm:text-5xl">
          {note.title}
        </h1>
        <p className="text-lg">{note.oneLineHook}</p>
        <p className="font-ui text-sm text-muted">{`${t('meta.reading')}: ${t('meta.readingValue', { n: note.readingTimeMin })}`}</p>
      </header>
      <Book labels={bookLabels(t)}>
        <section id={note.anchor} aria-labelledby={headingId} className="book-chapter measure mx-auto flex flex-col gap-5">
          <h2 id={headingId} data-anchor-heading="" tabIndex={-1} className="text-3xl text-glow">
            <InlineText text={note.chapterTitle} t={t} />
          </h2>
          <StoryText text={note.paragraphs.join('\n\n')} t={t} />
          <StoryText text={note.hook} t={t} className="border-s border-muted ps-4 italic" />
        </section>
      </Book>
    </article>
  );
}
