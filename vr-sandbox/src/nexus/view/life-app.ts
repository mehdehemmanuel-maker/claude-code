// The life graph on the phone: your people, places, times and memories, the eleven messengers, the brain's map.
//
// Owner of: how the life graph is DRAWN and pressed on the phone's screen. What is in the graph is
// `src/nexus/life/graph.ts` and the messengers' daily curves are `src/nexus/life/rhythm.ts`; nothing here decides a
// fact, only where it goes on a 360 x 620 screen.
//
// It lives apart from `view/apps.ts` because that file's own debt line has said "one file per app on the phone"
// since it was written, and the lint caught it at 815 lines when this app grew by five (ROUNDS 8y). Taking the
// biggest app out is the split that line was asking for.

import { BRAIN_MAP, MESSENGER_IDS, type Kind, type LifeGraph, type Node as LifeNode } from '../life/graph';
import { clock, dayOf, dayOfEach, RHYTHMS } from '../life/rhythm';
import { FONT, INK, INK2, INK3, type Kit, type Nav, type PhoneApp, type View } from './phone';

// ---- the life graph: your people, places, times and memories, the eleven messengers, the brain's map ----------------
export interface LifeHost { graph(): LifeGraph; save(): void }
/** The life graph on the phone (src/nexus/life/graph.ts): the brain's map, the messengers, the states they shape, and
 *  your own people, places, times and memories; a node opened shows everything linked to it round it, from either
 *  end; link it to anything, or add a memory to it. */
export function lifeApp(h: LifeHost): PhoneApp {
  const C = '#f48fb1', ROWS = 8, MINE: Kind[] = ['person', 'place', 'time', 'memory', 'note'];
  const ICON: Record<Kind, string> = { person: '🙂', place: '📍', time: '🕒', memory: '💭', note: '✎', messenger: '⚗', region: '🧠', organ: '🫀', state: '◐' };
  const TINT: Record<Kind, string> = { person: '#ffcc80', place: '#a5d6a7', time: '#90caf9', memory: '#ce93d8', note: '#e0e0e0', messenger: '#f48fb1', region: '#80deea', organ: '#ffab91', state: '#fff59d' };
  let said = '', linking: string | null = null;
  const listOf = (sub: string): LifeNode[] => { const g = h.graph(), k = sub.slice(5) as Kind | 'mine';
    if (k === 'mine') return MINE.flatMap((x) => g.ofKind(x)); if (k === 'messenger') return MESSENGER_IDS.map((id) => g.nodes.get(id)!).filter(Boolean); return g.ofKind(k as Kind).sort((a, b) => a.name.localeCompare(b.name)); };
  const nodeOf = (sub: string) => h.graph().of(sub.slice(5));
  return {
    id: 'life', name: 'Life graph', icon: '🕸', colour: C,
    pages: (sub) => (sub.startsWith('list:') ? Math.max(1, Math.ceil(listOf(sub).length / ROWS)) : sub.startsWith('node:') ? Math.max(1, Math.ceil((nodeOf(sub)?.linked.length ?? 0) / 6)) : 1),
    draw(k: Kit, v: View) {
      const { text, wrapped, button, g, W, bottom, hit } = k, sub = v.sub, gr = h.graph();
      const back = (to = '') => button(30, bottom - 70, W - 60, 56, '‹ Back', 'go', to, '#cfd8dc');
      const tell = () => { if (said) wrapped(said, 40, bottom - 92, 14, W - 80, '#ffd740', 2); };
      if (!sub) {
        text('Life graph', 40, 118, 42, C, 800);
        wrapped(linking ? `Linking ${gr.nodes.get(linking)?.name}: open what to link it to.` : 'Your people, places, times and memories, the eleven messengers and the brain they work in. Open any node: all it is linked to is round it.', 40, 150, 16, W - 80, INK2, 3);
        const bw = (W - 70) / 2, tiles: [string, string][] = [['🧠 Brain map', 'map'], ['⚗ Messengers', 'list:messenger'], ['◐ States', 'list:state'], ['🙂 Yours', 'list:mine']];
        tiles.forEach(([t, to], i) => button(30 + (i % 2) * (bw + 10), 220 + Math.floor(i / 2) * 82, bw, 72, t, 'go', to, C));
        text('Add your own', 40, 412, 18, C, 700);
        MINE.slice(0, 4).forEach((x, i) => button(30 + (i % 2) * (bw + 10), 430 + Math.floor(i / 2) * 70, bw, 60, `+ ${ICON[x]} ${x}`, 'add', x, TINT[x]));
        button(30, 580, W - 60, 60, '⌕ Find a node', 'find', undefined, C);
        const mine = MINE.reduce((a, x) => a + gr.ofKind(x).length, 0), links = gr.links.filter((l) => l.mine).length;
        text(`${mine} of your own · ${links} links you made · ${gr.nodes.size} nodes in all`, 40, 676, 14, INK3, 500, W - 80);
        if (linking) button(30, bottom - 140, W - 60, 56, '✕ Stop linking', 'unlinking', undefined, '#ef9a9a');
        tell(); return;
      }
      if (sub === 'map') {
        text('The brain, from the middle', 40, 112, 28, C, 800, W - 80);
        // (a midline view of one half, front to the left: the cerebrum's outline, the cerebellum behind and below, the
        // brainstem down to the cord; the regions where the textbooks' figures put them: schematic)
        const x0 = 30, y0 = 140, w = W - 60, ht = Math.min(bottom - 330, w * 1.35), X = (u: number) => x0 + u * w, Y = (u: number) => y0 + u * ht;
        g.save(); g.strokeStyle = 'rgba(244,143,177,0.55)'; g.fillStyle = 'rgba(244,143,177,0.08)'; g.lineWidth = 3;
        g.beginPath(); g.ellipse(X(0.5), Y(0.36), w * 0.46, ht * 0.32, 0, 0, Math.PI * 2); g.fill(); g.stroke();
        g.beginPath(); g.ellipse(X(0.83), Y(0.7), w * 0.13, ht * 0.11, -0.2, 0, Math.PI * 2); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(X(0.57), Y(0.6)); g.lineTo(X(0.71), Y(0.6)); g.lineTo(X(0.71), Y(0.98)); g.lineTo(X(0.64), Y(0.98)); g.closePath(); g.fill(); g.stroke(); g.restore();
        // (each region a dot; its name beside it where it fits, tried right, left, above and below, never over another's)
        const taken: [number, number, number, number][] = [], fits = (b: [number, number, number, number]) => b[0] >= 4 && b[2] <= W - 4 && taken.every((t) => b[2] < t[0] || b[0] > t[2] || b[3] < t[1] || b[1] > t[3]);
        const dots = BRAIN_MAP().map((r) => ({ r, cx: X(r.at![0]), cy: Y(r.at![1]), n: gr.of(r.id)!.linked.filter((l) => l.node.kind === 'messenger').length }));
        for (const d of dots) { taken.push([d.cx - 8, d.cy - 8, d.cx + 8, d.cy + 8]); g.fillStyle = d.n ? C : TINT.region; g.beginPath(); g.arc(d.cx, d.cy, d.n ? 8 : 6, 0, Math.PI * 2); g.fill(); hit(d.cx - 14, d.cy - 14, d.cx + 14, d.cy + 14, 'open', d.r.id); }
        g.font = `600 12px ${FONT}`;
        for (const d of dots) { const name = d.r.name.replace(/ \(.*\)$/, ''), tw = g.measureText(name).width;
          const tries: [number, number][] = [[d.cx + 11, d.cy + 4], [d.cx - 11 - tw, d.cy + 4], [d.cx - tw / 2, d.cy - 12], [d.cx - tw / 2, d.cy + 20]];
          const at = tries.find(([x, y]) => fits([x - 1, y - 11, x + tw + 1, y + 3])); if (!at) continue; taken.push([at[0] - 1, at[1] - 11, at[0] + tw + 1, at[1] + 3]); text(name, at[0], at[1], 12, INK, 600, tw + 4); }
        wrapped('Pink: a messenger is made or acts there. Places schematic (the textbooks\' figures, by eye); the temporal lobe drawn from the side.', 40, Y(1) + 22, 13, W - 80, INK3, 2);
        back(); return;
      }
      if (sub.startsWith('day:')) {
        // (its level over the clock for the user's own sleep: the night shaded, now marked, its figures' source below)
        const r = RHYTHMS[sub.slice(4)]; if (!r) { back(); return; } const d = gr.day, x0 = 50, x1 = W - 30, y0 = 180, y1 = 470, X = (hh: number) => x0 + ((x1 - x0) * hh) / 24;
        text(`${r.id[0]!.toUpperCase()}${r.id.slice(1)} through the day`, 40, 112, 28, C, 800, W - 80);
        text(`Sleeping ${clock(d.sleep)} to ${clock(d.wake)}, ${d.age} years old`, 40, 146, 15, INK2, 500, W - 80);
        const vs = Array.from({ length: 97 }, (_, i) => r.at(i / 4, d)), top = Math.max(...vs) * 1.1, Y = (v: number) => y1 - ((y1 - y0) * v) / top;
        g.save(); g.fillStyle = 'rgba(144,202,249,0.12)'; const s0 = d.sleep, s1 = d.wake; if (s0 < s1) g.fillRect(X(s0), y0, X(s1) - X(s0), y1 - y0); else { g.fillRect(X(s0), y0, X(24) - X(s0), y1 - y0); g.fillRect(X(0), y0, X(s1) - X(0), y1 - y0); }
        g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y1); g.lineTo(x1, y1); g.moveTo(x0, y0); g.lineTo(x0, y1); g.stroke();
        g.strokeStyle = C; g.lineWidth = 3; g.beginPath(); vs.forEach((v, i) => (i ? g.lineTo(X(i / 4), Y(v)) : g.moveTo(X(0), Y(v)))); g.stroke();
        const now = new Date(), hn = now.getHours() + now.getMinutes() / 60; g.strokeStyle = '#ffd740'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(hn), y0); g.lineTo(X(hn), y1); g.stroke(); g.restore();
        for (const hh of [0, 6, 12, 18, 24]) text(hh === 24 ? '' : clock(hh), X(hh) - 18, y1 + 22, 12, INK3, 500, 60);
        text(`${top < 10 ? (top / 1.1).toFixed(1) : Math.round(top / 1.1)}`, 6, Y(top / 1.1) + 4, 12, INK3, 500, 42); text(r.unit, x0 + 6, y0 - 8, 12, INK3, 500, W - 100);
        let y = y1 + 56; y += wrapped(`Now, ${clock(hn)}: ${r.at(hn, d).toFixed(1)} ${r.unit}, ${r.says(hn, d)}.`, 40, y, 16, W - 80, '#ffd740', 3) + 10;
        wrapped(r.src, 40, y, 12, W - 80, INK3, 7);
        button(30, bottom - 140, W - 60, 56, '◷ When I sleep and wake', 'setday', undefined, C); tell(); back(`node:${r.id}`); return;
      }
      if (sub.startsWith('list:')) {
        const all = listOf(sub), k0 = sub.slice(5), page = all.slice(v.page * ROWS, v.page * ROWS + ROWS);
        text(k0 === 'mine' ? 'Yours' : k0 === 'messenger' ? 'The messengers' : k0 === 'state' ? 'States' : k0, 40, 112, 32, C, 800, W - 80);
        // the whole set's state in one line, derived rather than written: how many of the eleven have a measured day
        // and how many say why they have none. Before this, nine of them simply showed nothing, which reads as nine
        // jobs not done when only two of them are (ROUNDS 8y).
        if (k0 === 'messenger') { const e = dayOfEach(), has = e.filter((x) => x.has).length;
          text(`${has} of ${e.length} have a measured day; ${e.length - has} say why not`, 40, 136, 13, INK3, 500, W - 80); }
        if (!all.length) wrapped(k0 === 'mine' ? 'Nothing of your own yet: add a person, a place, a time or a memory.' : 'None.', 40, 150, 16, W - 80, INK2, 3);
        page.forEach((n, j) => { const ry = 140 + j * 78; g.fillStyle = 'rgba(244,143,177,0.10)'; g.beginPath(); g.roundRect(30, ry, W - 60, 70, 12); g.fill();
          text(`${ICON[n.kind]} ${n.name}`, 46, ry + 30, 19, TINT[n.kind], 700, W - 92); text(n.says ?? n.is ?? n.kind, 46, ry + 56, 13, INK2, 500, W - 92); hit(30, ry, W - 30, ry + 70, 'open', n.id); });
        if (all.length > ROWS) text(`${v.page + 1} of ${Math.ceil(all.length / ROWS)}  ▲ ▼`, 40, bottom - 92, 14, INK3, 500);
        back(); return;
      }
      if (sub.startsWith('node:')) {
        const o = nodeOf(sub); if (!o) { text('Not found', 40, 120, 28, C, 800); back(); return; }
        const n = o.node; text(`${ICON[n.kind]} ${n.name}`, 40, 112, 28, TINT[n.kind], 800, W - 80);
        let y = 132 + wrapped([n.is && `${n.is}, made from ${n.from}`, n.says].filter(Boolean).join('. ') || n.kind, 40, 136, 14, W - 80, INK2, 4);
        // WHERE A MESSENGER HAS NO DAY, WHY IT HAS NONE — under what it is, before its web. It went beside the title
        // first, at the same height, and the title ran straight over it; the screenshot showed that and the tests did
        // not, which is what looking at the thing is for (ROUNDS 8y). Gold, because it is an answer and not a lack.
        { const noDay = gr.whyNoDay(n.id); if (noDay) y += 6 + wrapped(`◷ ${noDay.why}`, 40, y, 13, W - 80, '#ffd740', 2); }
        // (it in the middle, what it is linked to round it, each line said with how)
        // (each linked node once round it, however many links join them, said together)
        const one = new Map<string, { node: LifeNode; how: string; mine: boolean }>();
        for (const l of o.linked) { const had = one.get(l.node.id); one.set(l.node.id, had ? { ...had, how: `${had.how}, ${l.how}`, mine: had.mine || l.mine } : { node: l.node, how: l.how, mine: l.mine }); }
        const cx = W / 2, cy = y + 170, R = 140, ring = [...one.values()].slice(0, 12);
        ring.forEach((l, i) => { const a = -Math.PI / 2 + (i / Math.max(1, ring.length)) * Math.PI * 2, px = cx + R * Math.cos(a), py = cy + R * 0.82 * Math.sin(a);
          g.strokeStyle = l.mine ? '#ffd740' : 'rgba(255,255,255,0.25)'; g.lineWidth = l.mine ? 3 : 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(px, py); g.stroke();
          g.fillStyle = TINT[l.node.kind]; g.beginPath(); g.arc(px, py, 10, 0, Math.PI * 2); g.fill();
          text(l.node.name.replace(/ \(.*\)$/, ''), px + (Math.cos(a) < -0.2 ? -118 : 14), py + 4, 12, INK, 600, 106); hit(px - 16, py - 16, px + 16, py + 16, 'open', l.node.id); });
        g.fillStyle = TINT[n.kind]; g.beginPath(); g.arc(cx, cy, 16, 0, Math.PI * 2); g.fill();
        if (one.size > 12) text(`and ${one.size - 12} more below`, cx - 70, cy + R + 22, 12, INK3, 500, 140);
        y = cy + R * 0.82 + 34; const rows = o.linked.slice(v.page * 6, v.page * 6 + 6);
        rows.forEach((l, j) => { const ry = y + j * 30; text(`${l.out ? '' : '← '}${l.how} ${ICON[l.node.kind]} ${l.node.name}`, 40, ry, 14, l.mine ? '#ffd740' : INK, 600, W - 80); hit(30, ry - 20, W - 30, ry + 8, 'open', l.node.id); });
        if (o.linked.length > 6) text(`${v.page + 1} of ${Math.ceil(o.linked.length / 6)}  ▲ ▼`, W - 160, y - 22, 13, INK3, 500);
        const bw = (W - 70) / 2, by = bottom - 140;
        if (linking && linking !== n.id) button(30, by, W - 60, 56, `🔗 Link ${gr.nodes.get(linking)?.name ?? ''} to this`, 'link', n.id, '#ffd740');
        else { button(30, by, bw, 56, '🔗 Link to…', 'linkfrom', n.id, C); button(40 + bw, by, bw, 56, '+ 💭 A memory of it', 'memory', n.id, TINT.memory); }
        if (n.mine) button(W - 150, 92, 120, 36, '✕ Remove', 'remove', n.id, '#ef9a9a');
        else if (RHYTHMS[n.id]) button(W - 150, 92, 120, 36, '◷ Its day', 'go', `day:${n.id}`, C);
        // and where there is no day, WHY there is none, in its own words. A messenger that simply has no button
        // reads as work not done yet, and for five of the seven that is wrong: one was looked for and is not there,
        // two are measured and out of this container's reach, and three have no blood level to have a day at all.

        tell(); back(); return;
      }
    },
    act(act, arg, nav: Nav) {
      const gr = h.graph(), id = String(arg ?? '');
      switch (act) {
        case 'go': said = ''; nav.go(id); return true;
        case 'open': nav.go(`node:${id}`); return true;
        case 'add': nav.write(`the ${id}'s name (a person, a place, a time, or what you remember)`, (t) => { if (!t.trim()) return; const n = gr.add(id as Kind, t); if (linking) { gr.link(linking, n.id); } h.save(); said = `${n.name} added`; nav.go(`node:${n.id}`); nav.redraw(); }); return true;
        case 'find': nav.write('a name to find', (t) => { const f = gr.find(t); if (f[0]) nav.go(`node:${f[0].id}`); else said = `nothing called "${t}"`; nav.redraw(); }); return true;
        case 'linkfrom': linking = id; said = `Open what to link ${gr.nodes.get(id)?.name} to: a list, the map, or one of yours.`; nav.go(''); return true;
        case 'unlinking': linking = null; said = ''; return true;
        case 'link': { const from = linking; if (!from) return true; nav.write('how they are linked (with, at, felt, when…), or leave it', (t) => { const l = gr.link(from, id, t.trim() || 'linked to'); linking = null; h.save(); said = l ? `${gr.nodes.get(from)?.name} ${l.how} ${gr.nodes.get(id)?.name}` : 'not linked'; nav.redraw(); }); return true; }
        case 'memory': nav.write(`what you remember of ${gr.nodes.get(id)?.name}`, (t) => { if (!t.trim()) return; const m = gr.add('memory', t); gr.link(m.id, id, 'of'); h.save(); said = 'kept'; nav.go(`node:${m.id}`); nav.redraw(); }); return true;
        case 'remove': if (gr.remove(id)) { h.save(); said = 'removed'; nav.go('list:mine'); } return true;
        case 'setday': nav.write('when you sleep and wake (as 23:00 to 7:00), and your age if you like', (t) => { const age = Number(/\b(?:age|aged|i am|i'm)\s*(\d{1,3})\b/i.exec(t)?.[1] ?? gr.day.age), d = dayOf(t.replace(/\b(?:age|aged|i am|i'm)\s*\d{1,3}\b/i, ''), age); if (!d) { said = 'say two times, as 23:00 to 7:00'; nav.redraw(); return; } gr.day = d; h.save(); said = `kept: sleeping ${clock(d.sleep)} to ${clock(d.wake)}`; nav.redraw(); }); return true;
      }
      return false;
    },
  };
}
