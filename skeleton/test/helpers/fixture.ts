import { legendSchema, type Hotspot, type Legend, type PuzzleType } from '../../src/index.ts';

// A small hand-made legend that satisfies every generator rule. It exists so the properties can be
// proved on content we control; the real legends are tested separately and may fail on content gaps.
const n = (x: string): string => `fx:${x}`;

type FactSpec = [id: string, type: PuzzleType, answer: string, version: string | null, anchor: string, confidence?: 'R'];
const FACTS: FactSpec[] = [
  ['f1', 'original-name', 'ben side', null, 'fx--ch-1'],
  ['f2', 'original-name', 'bean chaointe', 'v-a', 'fx--ch-1'],
  ['f3', 'original-name', 'bean nighe', 'v-b', 'fx--ch-1'],
  ['f4', 'original-name', 'sidhe woman', null, 'fx--ch-1'],
  ['f5', 'date-or-number', 'nineteen forty nine', null, 'fx--ch-2', 'R'],
  ['f6', 'date-or-number', 'twelve keeners', 'v-a', 'fx--ch-2'],
  ['f7', 'date-or-number', 'three nights', 'v-b', 'fx--ch-2'],
  ['f8', 'date-or-number', 'seven years', null, 'fx--ch-2'],
  ['f9', 'weakness', 'iron nails', null, 'fx--ch-3'],
  ['f10', 'weakness', 'running water', 'v-a', 'fx--ch-3'],
  ['f11', 'weakness', 'rowan wood', 'v-b', 'fx--ch-3'],
  ['f12', 'weakness', 'salt line', null, 'fx--ch-3'],
  ['f13', 'true-or-told', 'told', null, 'fx--ch-3'],
  ['f14', 'true-or-told', 'documented', 'v-a', 'fx--ch-3'],
  ['f15', 'true-or-told', 'told', 'v-b', 'fx--ch-3'],
  ['f16', 'true-or-told', 'documented', null, 'fx--ch-3', 'R'],
  ['f17', 'object-match', 'silver comb', null, 'fx--ch-2'],
  ['f18', 'object-match', 'wooden bowl', 'v-a', 'fx--ch-2'],
  ['f19', 'object-match', 'clay jug', 'v-b', 'fx--ch-2'],
  ['f20', 'object-match', 'red shawl', null, 'fx--ch-2'],
  ['f21', 'ritual-order', 'salutation, dirge, cry', 'v-a', 'fx--ch-1'],
  ['f22', 'ritual-order', 'cry, dirge, salutation', 'v-b', 'fx--ch-1'],
];

const wrong = (answer: string): string[] => [`not ${answer} one`, `not ${answer} two`, `not ${answer} three`, `not ${answer} four`];

const slot = (id: string, type: PuzzleType, facts: string[], hint2Anchor: string, isFinal = false) => ({
  id: n(id),
  label: id,
  type,
  isFinal,
  candidateFactIds: facts.map(n),
  hint1: { text: `look near ${id}`, highlight: [n('h1')] },
  hint2Anchor,
});

const hs = (id: string, sceneId: string, role: Hotspot['role'], swappable: boolean, links: Hotspot['links']): Hotspot => ({ id: n(id), sceneId: n(sceneId), object: `object ${id}`, role, swappable, links, onTap: `tap ${id}` });
const facts = (...ids: string[]): Hotspot['links'] => ids.map((id) => ({ kind: 'fact' as const, factId: n(id) }));
const step = (lead: string, s: number): Hotspot['links'][number] => ({ kind: 'leadStep', leadId: n(lead), step: s });

export function makeFixture(): Legend {
  const chapterText = (anchor: string): string =>
    FACTS.filter((f) => f[4] === anchor && f[1] !== 'true-or-told' && f[1] !== 'ritual-order').map((f) => `The tale says ${f[2]}.`).join(' ');
  return legendSchema.parse({
    id: 'fx',
    meta: { title: 'Fixture', region: 'nowhere', countryTheme: 'none', mapPoint: { lat: 0, lng: 0 }, era: 'test', scareLevel: 1, readingTimeMin: 1, oneLineHook: 'hook' },
    coldOpen: 'cold open',
    chapters: [1, 2, 3].map((i) => ({ id: n(`ch-${i}`), ordinal: i, anchor: `fx--ch-${i}`, title: `Chapter ${i}`, sources: ['S1'], text: chapterText(`fx--ch-${i}`), hook: 'hook' })),
    versions: ['v-a', 'v-b'].map((v) => ({ id: n(v), sourceType: 't', era: 't', claim: 'c', conflicts: 'x', sourceId: 'S1', anchor: `fx--versions--${v}`, paragraph: `paragraph ${v}` })),
    documentedTold: { rows: [{ documented: 'd', told: 't' }], closing: 'end' },
    facts: FACTS.map(([id, type, answer, version, anchor, confidence]) => ({
      id: n(id),
      statement: `statement ${id}`,
      confidence: confidence ?? 'checked',
      anchor,
      versionId: version ? n(version) : null,
      puzzleTypes: [type],
      answer,
      wrongAnswers: wrong(answer),
      difficulty: 1,
    })),
    leads: [
      { id: n('lead-1'), startsFrom: n('v-a'), steps: ['a1', 'a2', 'a3'], deadEnd: 'dead end 1', contradiction: { factIds: [n('f10')], anchors: ['fx--ch-3'] }, canBeTrueFor: [n('v-a')] },
      { id: n('lead-2'), startsFrom: n('v-b'), steps: ['b1', 'b2', 'b3'], deadEnd: null, contradiction: null, canBeTrueFor: [n('v-b')] },
      { id: n('lead-3'), startsFrom: n('v-a'), steps: ['c1', 'c2'], deadEnd: 'dead end 3', contradiction: { factIds: [n('f2')], anchors: ['fx--ch-1'] }, canBeTrueFor: 'never' },
    ],
    world: {
      setting: 'a room',
      scenes: [
        { id: n('sc-1'), name: 'one', description: 'd' },
        { id: n('sc-2'), name: 'two', description: 'd' },
      ],
      hotspots: [
        hs('h1', 'sc-1', 'meaningful', true, [...facts('f1', 'f2', 'f3', 'f4'), step('lead-1', 1)]),
        hs('h2', 'sc-1', 'meaningful', true, [...facts('f5', 'f6', 'f7', 'f8'), step('lead-1', 2)]),
        hs('h3', 'sc-1', 'decoy', true, []),
        hs('h4', 'sc-1', 'meaningful', false, [...facts('f9', 'f10', 'f11', 'f12'), step('lead-1', 3)]),
        hs('h5', 'sc-2', 'meaningful', true, [...facts('f13', 'f14', 'f15', 'f16'), step('lead-2', 1)]),
        hs('h6', 'sc-2', 'decoy', true, []),
        hs('h7', 'sc-2', 'meaningful', false, [...facts('f17', 'f18', 'f19', 'f20'), step('lead-2', 2), step('lead-2', 3)]),
        hs('h8', 'sc-2', 'meaningful', false, facts('f21', 'f22')),
        ...['h9', 'h10'].map((id) => hs(id, 'sc-1', 'decoy', false, [])),
        ...['h11', 'h12', 'h13'].map((id) => hs(id, 'sc-2', 'decoy', false, [])),
      ],
      spirit: 'a spirit',
      slots: [
        slot('s1', 'original-name', ['f1', 'f2', 'f3', 'f4'], 'fx--ch-1'),
        slot('s2', 'date-or-number', ['f5', 'f6', 'f7', 'f8'], 'fx--ch-2'),
        slot('s3', 'weakness', ['f9', 'f10', 'f11', 'f12'], 'fx--ch-3'),
        slot('s4', 'true-or-told', ['f13', 'f14', 'f15', 'f16'], 'fx--versions'),
        slot('s5', 'object-match', ['f17', 'f18', 'f19', 'f20'], 'fx--versions--v-a', true),
        slot('s6', 'ritual-order', ['f21', 'f22'], 'fx--ch-1'),
      ],
      finalPuzzle: { description: 'final puzzle text', hint1: null, hint2Anchor: null },
      fearEvents: [{ id: n('fe-1'), description: 'bell', reducedMotion: 'caption' }],
    },
    theme: { palette: 'p', displayFont: 'd', bodyFont: 'b', textures: 't', motifs: 'm', ambientSound: 'a', uiAccents: 'u' },
    assets: [],
    sources: [{ id: 'S1', title: 't', author: 'a', year: '2000', url: 'u', publicDomain: 'no', supports: 's' }],
    anchors: ['fx--ch-1', 'fx--ch-2', 'fx--ch-3', 'fx--versions', 'fx--versions--v-a', 'fx--versions--v-b'],
  });
}
