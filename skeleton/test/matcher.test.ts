import { describe, expect, it } from 'vitest';
import { answerInText, answerParts, normalise, surname, toParagraphs } from '../src/generator/normalise.ts';
import { legendById } from './helpers/legends.ts';

const p = (...paragraphs: string[]): string[] => paragraphs;

describe('normalise', () => {
  it('ignores case, diacritics, punctuation, markdown marks and plural s', () => {
    expect(normalise('Frodá, the *Draugr* Halls!')).toBe(normalise('froda the draugr hall'));
  });
});

describe('answerParts (R5.10 steps 1 and 2)', () => {
  it('strips a leading documented:, told: or proposed: label', () => {
    expect(answerParts('documented: iron nails')).toEqual([['iron', 'nail']]);
    expect(answerParts('Told: iron nails')).toEqual([['iron', 'nail']]);
    expect(answerParts('proposed: iron nails')).toEqual([['iron', 'nail']]);
    expect(answerParts('untold iron nails')).toEqual([['untold', 'iron', 'nail']]);
  });

  it('splits on commas, "and" and parentheses, and ignores the filler words', () => {
    expect(answerParts('white dress, red hair and a pale face')).toEqual([['white', 'dres'], ['red', 'hair'], ['pale', 'face']]);
    expect(answerParts('Craglea (near Killaloe)')).toEqual([['craglea'], ['killaloe']]);
    expect(answerParts('the hair of the dead')).toEqual([['hair', 'dead']]);
  });

  it('does not split inside a word that contains "and"', () => {
    expect(answerParts('Sandwich')).toEqual([['sandwich']]);
    expect(answerParts('Ireland')).toEqual([['ireland']]);
  });
});

describe('answerInText on the real banshee text', () => {
  const l = legendById('banshee');
  const chapter = (n: number) => toParagraphs(l.chapters[n - 1]!.text);
  const fact = (id: string) => l.facts.find((f) => f.id === `banshee:${id}`)!;

  it('f12 "white dress, red hair, pale face" is found in chapter 4 ("dressed in white, with red hair and a pale, ghastly face")', () => {
    const f = fact('f12');
    expect(f.anchor).toBe('banshee--ch-4');
    expect(answerInText(chapter(4), f.answer, 'symbol')).toBe(true);
    expect(answerInText(chapter(4), f.answer, 'object-match')).toBe(true);
  });

  it('f16 "Craglea, near Killaloe" is found in chapter 3', () => {
    const f = fact('f16');
    expect(f.anchor).toBe('banshee--ch-3');
    expect(answerInText(chapter(3), f.answer, 'object-match')).toBe(true);
  });

  it('f12 is not found in a chapter that never describes the figure', () => {
    expect(answerInText(chapter(2), fact('f12').answer, 'symbol')).toBe(false);
  });
});

describe('answerInText rules', () => {
  it('"bare feet" does not match text that only says "barefoot"', () => {
    expect(answerInText(p('The keeners went barefoot to the wake.'), 'bare feet', 'symbol')).toBe(false);
    expect(answerInText(p('The keeners went with bare feet to the wake.'), 'bare feet', 'symbol')).toBe(true);
  });

  it('words split across two paragraphs fail; the same words in one paragraph pass', () => {
    expect(answerInText(p('She wore white.', 'Her hair was long.'), 'white hair', 'symbol')).toBe(false);
    expect(answerInText(p('She wore white and her hair was long.'), 'white hair', 'symbol')).toBe(true);
  });

  it('every part must pass, and each part may pass in a different paragraph', () => {
    const text = p('Her hair was red.', 'Elsewhere the face was pale.');
    expect(answerInText(text, 'red hair, pale face', 'symbol')).toBe(true);
    expect(answerInText(text, 'red hair, pale face, black shawl', 'symbol')).toBe(false);
  });

  it('word order and the filler words do not matter', () => {
    expect(answerInText(p('With red hair and a pale face.'), 'face of the pale, hair red', 'symbol')).toBe(true);
  });

  it('a label on the answer is ignored', () => {
    expect(answerInText(p('They kept it for funerals only.'), 'documented: funerals only', 'weakness')).toBe(true);
  });

  it('folds a trailing -ed on words over four letters, so "dressed" matches "dress"; other forms still do not match', () => {
    expect(answerInText(p('She was dressed in white.'), 'white dress', 'symbol')).toBe(true);
    expect(answerInText(p('She was dressing in white.'), 'white dress', 'symbol')).toBe(false);
    expect(answerInText(p('The need was great.'), 'nee', 'symbol')).toBe(false);
    expect(answerInText(p('He walked home.'), 'walk home', 'symbol')).toBe(true);
  });

  it('matches whole words only, with plural s folded', () => {
    expect(answerInText(p('the seventh year'), 'seven', 'date-or-number')).toBe(false);
    expect(answerInText(p('for seven years'), 'seven year', 'date-or-number')).toBe(true);
    expect(answerInText(p('Twelve keeners came.'), 'twelve keeper', 'date-or-number')).toBe(false);
  });

  it('an answer with no content words never passes', () => {
    expect(answerInText(p('anything at all'), '   ', 'symbol')).toBe(false);
    expect(answerInText(p('anything at all'), 'the of and', 'symbol')).toBe(false);
  });
});

describe('who-said-it: the surname is enough', () => {
  it('passes when the surname appears anywhere in the linked text', () => {
    expect(answerInText(p('Lady Fanshawe wrote it down.'), 'Ann, Lady Fanshawe', 'who-said-it')).toBe(true);
    expect(answerInText(p('Lysaght said so.'), 'Patricia Lysaght', 'who-said-it')).toBe(true);
  });

  it('fails when the surname is absent, even if the first name is there', () => {
    expect(answerInText(p('Patricia wrote it down.'), 'Patricia Lysaght', 'who-said-it')).toBe(false);
  });

  it('ignores a label and a parenthesis when it picks the surname', () => {
    expect(surname('documented: Eleanor Hull (1898)')).toBe('hull');
  });

  it('applies only to who-said-it', () => {
    expect(answerInText(p('Lysaght said so.'), 'Patricia Lysaght', 'object-match')).toBe(false);
  });

  it('is f15 on the real banshee text', () => {
    const l = legendById('banshee');
    const f = l.facts.find((x) => x.id === 'banshee:f15')!;
    expect(answerInText(toParagraphs(l.chapters[3]!.text), f.answer, 'who-said-it')).toBe(true);
  });
});
