// What a person means on a board (src/nexus/substrate/understand.ts): said roughly, misspelled, or described for want of the
// word; read against what Nexus knows the names of and against the board, and given back as what was understood and
// the changes it asks for, none of them made until taken.

import { describe, expect, it } from 'vitest';
import { addNode, deepMerge, link, nodesOf, type Board, type Patch } from '../../src/nexus/substrate/boards';
import { checked, claudePrompt, clauses, edits, named, resolve, spelling, stem, termsIn, understand } from '../../src/nexus/substrate/understand';

const apply = (b: Board, p: Patch | null) => (p ? deepMerge(b, p) : b);
function board(...labels: string[]): Board {
  let b: Board = { title: 't', nodes: {}, edges: {} };
  for (const l of labels) b = apply(b, addNode(l).patch);
  return b;
}
const id = (b: Board, l: string) => nodesOf(b).find((n) => n.label === l)!.id;

describe('the words', () => {
  it('one word, however it ends: tyres and tyre, turning and turn', () => {
    expect(stem('tyres')).toBe(stem('tyre')); expect(stem('turning')).toBe('turn'); expect(stem('batteries')).toBe('battery'); expect(stem('glass')).toBe('glass');
    expect(edits('moter', 'motor')).toBe(1); expect(edits('whele', 'wheel')).toBe(1);
  });
  it('knows a word spelled its own way, and leaves alone what is spelled right or is plain English', () => {
    expect(spelling('moter')).toBe('motor');
    expect(spelling('batery')).toBe('battery'); expect(spelling('whele')).toBe('wheel');
    expect(spelling('motor')).toBeNull(); expect(spelling('thing')).toBeNull(); expect(spelling('go')).toBeNull();
    // one word in two spellings is not a mistake
    expect(spelling('tyre')).toBeNull(); expect(spelling('colour')).toBeNull(); expect(spelling('aluminium')).toBeNull();
  });
  it('names what is described, from what the taxonomy says each thing is for', () => {
    expect(named('the thing that turns torque into force on the ground')[0]!.name).toBe('Wheels');
    expect(named('what takes the motion away as heat')[0]!.name).toBe('Brakes');
    expect(named('springs between the ground and what it carries')[0]!.name).toBe('Suspension');
  });
  it('finds the manifold terms the words name outright', () => {
    expect(termsIn('it runs on fuel cells').map((t) => t.name.toLowerCase())).toContain('fuel cells');
    expect(termsIn('put solar on the roof').map((t) => t.name.toLowerCase())).toContain('solar');
  });
});

describe('a board, and what the words ask of it', () => {
  it('“X goes under Y”: a link, and a node added where the words name one that is not there', () => {
    const b = board('Vehicle', 'Wheels'), u = understand('wheels go under vehicle', b, null);
    expect(u.proposals).toEqual([expect.objectContaining({ op: 'link', a: id(b, 'Vehicle'), c: id(b, 'Wheels') })]);
    const v = understand('the brakes go under wheels', b, null);
    expect(v.proposals).toEqual([expect.objectContaining({ op: 'add', label: 'Brakes', under: id(b, 'Wheels') })]);
  });
  it('“add rim and tyre to wheels”: two nodes, each linked; with nothing named, to the node that is open', () => {
    const b = board('Wheels', 'Motor');
    expect(understand('add rim and tyre to wheels', b, null).proposals.map((p) => p.op === 'add' && `${p.label}<${p.under}`)).toEqual([`Rim<${id(b, 'Wheels')}`, `Tyre<${id(b, 'Wheels')}`]);
    expect(understand('add a shaft', b, id(b, 'Motor')).proposals).toEqual([expect.objectContaining({ op: 'add', label: 'Shaft', under: id(b, 'Motor') })]);
  });
  it('two requests run together with “and” are two; two things joined by “and” are one request', () => {
    expect(clauses('add a rim to wheel and the moter needs a batery')).toEqual(['add a rim to wheel', 'the moter needs a batery']);
    expect(clauses('motor and battery go under power')).toEqual(['motor and battery go under power']);
    expect(clauses('add rim and tyre to wheels')).toEqual(['add rim and tyre to wheels']);
    const b = board('Car', 'Wheel', 'Motor'), u = understand('add a rim to wheel and the moter needs a batery', b, null);
    expect(u.proposals.map((p) => p.op === 'add' && `${p.label}<${p.under}`)).toEqual([`Rim<${id(b, 'Wheel')}`, `Battery<${id(b, 'Motor')}`]);
  });
  it('a new parent for several: added once, the rest linked to it by its name', () => {
    const b = board('Motor', 'Battery'), u = understand('motor and battery go under power', b, null);
    expect(u.proposals.filter((p) => p.op === 'add').map((p) => p.op === 'add' && p.label)).toEqual(['Power']);
    expect(u.proposals.filter((p) => p.op === 'link').map((p) => p.op === 'link' && [p.a, p.c])).toEqual([['@Power', id(b, 'Motor')], ['@Power', id(b, 'Battery')]]);
  });
  it('“this needs a battery”: the open node, and the board’s node for battery, misspelled or not', () => {
    const b = board('Robot', 'Battery');
    expect(understand('this needs a batery', b, id(b, 'Robot')).proposals).toEqual([expect.objectContaining({ op: 'link', a: id(b, 'Robot'), c: id(b, 'Battery') })]);
  });
  it('renames, unlinks, and the spelling on the board itself', () => {
    let b = board('Moter', 'Frame', 'Tyre'); b = apply(b, link(b, id(b, 'Tyre'), id(b, 'Frame')));
    const u = understand('unlink tyre from frame. rename frame to chassis. and fix the spelling', b, null);
    expect(u.proposals).toEqual(expect.arrayContaining([expect.objectContaining({ op: 'unlink' }), expect.objectContaining({ op: 'rename', node: id(b, 'Frame'), to: 'Chassis' }), expect.objectContaining({ op: 'rename', node: id(b, 'Moter'), to: 'Motor' })]));
  });
  it('a vague node, described, is offered its name', () => {
    const b = board('Cart', 'thing'), u = understand('it is the thing that takes motion away as heat', b, id(b, 'thing'));
    expect(u.terms[0]!.means).toBe('Brakes');
    expect(u.proposals).toContainEqual(expect.objectContaining({ op: 'rename', node: id(b, 'thing'), to: 'Brakes' }));
    expect(u.understood).toMatch(/Brakes/);
  });
  it('“X is what …” describes X: it is named for what the words say it does, not linked to the words', () => {
    const b = board('Cart', 'thing', 'Tyre'), u = understand('the thing is what takes motion away as heat', b, null);
    expect(u.proposals).toEqual([expect.objectContaining({ op: 'rename', node: id(b, 'thing'), to: 'Brakes' })]);
    expect(u.understood).toMatch(/thing is Brakes/);
  });
  it('leaves a label alone unless its words are said or the spelling is asked about; a short word is never “corrected”', () => {
    expect(understand('add rim to wheel', board('Cart', 'Moter', 'Wheel'), null).proposals.filter((p) => p.op === 'rename')).toEqual([]);
    expect(understand('check the spelling', board('Cart', 'Moter'), null).proposals).toEqual([expect.objectContaining({ op: 'rename', to: 'Motor' })]);
    expect(spelling('cart')).toBeNull();
  });
  it('words it cannot place are said back, with ways to say them', () => {
    const u = understand('blorp the zorp', board('A'), null);
    expect(u.proposals).toEqual([]); expect(u.understood).toMatch(/I heard “blorp the zorp”/);
  });
});

describe("Claude's reading, checked against the board", () => {
  it('keeps the changes that name what is there or what it adds, and drops the rest', () => {
    const b = board('Motor', 'Battery');
    const r = checked({ understood: 'You want power over both.', terms: [{ said: 'juice', means: 'Battery', why: 'stores charge' }], proposals: [{ op: 'add', label: 'Power' }, { op: 'link', a: 'Power', c: 'Motor' }, { op: 'link', a: 'Power', c: 'battery' }, { op: 'link', a: 'Nothing', c: 'Motor' }, { op: 'rename', node: 'Motor', to: 'Drive motor' }, { op: 'bogus' }] }, b)!;
    expect(r.proposals.map((p) => p.op)).toEqual(['add', 'link', 'link', 'rename']);
    expect(resolve(b, '@motor')).toBe(id(b, 'Motor')); expect(resolve(b, '@Power')).toBeUndefined();
    expect(checked('not json', b)).toBeNull();
  });
});

describe('calling Claude on a board', () => {
  it('gives it the words as said, the board as the links make it, the node open, and the answer to give as data', () => {
    let b = board('Vehicle', 'Wheel', 'thing'); b = apply(b, link(b, id(b, 'Vehicle'), id(b, 'Wheel')));
    const words = 'the thing that stops it goes under vehicle', p = claudePrompt(words, b, id(b, 'thing'), understand(words, b, id(b, 'thing')));
    expect(p).toContain(`"${words}"`);
    expect(p).toMatch(/- Wheel \[subcategory, 1 links, under Vehicle\]/);
    expect(p).toContain('Links: Vehicle — Wheel');
    expect(p).toContain('The node open in front of them: thing.');
    expect(p).toMatch(/hard to say exactly what they mean/);
    expect(p).toMatch(/"proposals": \[/);
  });
});
