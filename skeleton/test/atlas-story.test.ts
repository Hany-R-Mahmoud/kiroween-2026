import { describe, expect, it } from 'vitest';
import { storyBlocks, type StoryBlock } from '../src/atlas/story.ts';
import { allLegends } from './helpers/legends.ts';

const t = (text: string) => ({ kind: 'text' as const, text });
const em = (text: string) => ({ kind: 'em' as const, text });
const drama = { kind: 'dramatization' as const };
const plain = (blocks: StoryBlock[]) => blocks.map((b) => b.map((x) => (x.kind === 'dramatization' ? '[D]' : x.text)).join('')).join('\n');

describe('storyBlocks', () => {
  it('splits paragraphs on blank lines and joins wrapped lines', () => {
    expect(storyBlocks('One\ntwo.\n\n  \nThree.')).toEqual([[t('One two.')], [t('Three.')]]);
  });

  it('reads Markdown italics', () => {
    expect(storyBlocks('In Irish she is the *bean sí*. *Bean* is "woman".')).toEqual([[t('In Irish she is the '), em('bean sí'), t('. '), em('Bean'), t(' is "woman".')]]);
  });

  it('marks [Dramatization] at the start and in the middle', () => {
    expect(storyBlocks('[Dramatization] It is late.')).toEqual([[drama, t(' It is late.')]]);
    expect(storyBlocks('A record. [Dramatization]   Then a cry.')).toEqual([[t('A record. '), drama, t(' Then a cry.')]]);
  });

  it('keeps unclosed or spaced stars as text', () => {
    expect(storyBlocks('5 * 3 and *open')).toEqual([[t('5 * 3 and *open')]]);
    expect(storyBlocks('a * b * c')).toEqual([[t('a * b * c')]]);
  });

  it('drops a divider line left at the end of a section, and empty paragraphs', () => {
    expect(storyBlocks('Last line.\n---')).toEqual([[t('Last line.')]]);
    expect(storyBlocks('A.\n\n---\n\nB.')).toEqual([[t('A.')], [t('B.')]]);
    expect(storyBlocks('')).toEqual([]);
  });

  it('never produces markup: tags stay as text', () => {
    expect(storyBlocks('<b>x</b> & <script>')).toEqual([[t('<b>x</b> & <script>')]]);
  });

  it('every story text in the twelve legends reads with no raw markers left, and every [Dramatization] is marked', () => {
    let marks = 0;
    let sources = 0;
    for (const l of allLegends) {
      const texts = [l.coldOpen, l.documentedTold.closing, ...l.chapters.flatMap((c) => [c.text, c.hook]), ...l.versions.map((v) => v.paragraph)];
      for (const text of texts) {
        const blocks = storyBlocks(text);
        sources += text.split('[Dramatization]').length - 1;
        marks += blocks.flat().filter((x) => x.kind === 'dramatization').length;
        const out = plain(blocks);
        expect(out, l.id).not.toMatch(/\*|\[Dramatization\]|^\s*-{3,}\s*$/m);
      }
    }
    expect(sources).toBeGreaterThan(10);
    expect(marks).toBe(sources);
  });
});
