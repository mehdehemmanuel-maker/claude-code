// PAGES, NODES, GRAPHS AND PIPELINES, IN A PAGE — the headset's board on a laptop or a phone.
//
// It is a second PROJECTION of one engine, not a second engine: `substrate/boards.ts` owns what a board is (its
// nodes, its links, what derives from them — which node is a category, what is under it, what order the steps come
// in), `substrate/flows.ts` owns what a pipeline is and runs it, `view/boards-store.ts` keeps them, and
// `view/boards3d.ts` is the same thing drawn on a wall in front of you. Change the engine and both views change.
//
// What a person does here, in the user's own words: *"make a page and that page basically is a node type then I can
// add as many nodes and I can connect those nodes to different node types just by selecting them"*. So a PAGE is a
// node with things under it, a NODE is a word, and connecting is two clicks — pick one, pick another. The pipeline
// view is the same nodes in the order they are derived, each able to be given something to do.
//
// Owner of: the 2D board page.

import {
  RELS, addNode, deleteNode, derive, duplicateNode, edgesOf, freeName, levelOf, nodesOf, toggleLink, uid,
  type Board, type Derived, type Live,
} from '../substrate/boards';
import { makeBoardStore, type BoardStore } from './boards-store';
import { CALLS } from '../substrate/calls';
import { SUGGEST, TEMPLATES, boardOfTemplate, clipOf, graphOf, orderFrom, pasteOf, runFlow, stepOf, triggersOf, type FlowRun, type Step, type StepKind } from '../substrate/flows';
import { engineHands, runHtml, type Trace, type Worked } from './flow2d';
import { mountScenes, showHtml } from './show';
import { mindBoxHtml, wireMindBox } from './mind-box';
import { dragCard, wiresSvg } from './wires';

const esc = (s: unknown) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const KINDS: StepKind[] = ['trigger', 'ai', 'action', 'check', 'repeat'];
/** What each kind is called where a person reads it, rather than in the engine's own word. */
const KIND_SAYS: Record<StepKind, string> = {
  trigger: 'starts it', ai: 'asks the model', action: 'does something', check: 'carries on only if', repeat: 'goes round until',
};

interface State {
  store: BoardStore | null; at: string | null; view: 'wires' | 'pages' | 'pipeline';
  /** how far in, and where the picture has been dragged to, in the wires view */ zoom: number; panX: number; panY: number;
  /** the node picked first, waiting for a second to connect to */ picked: string | null;
  rel: string; run: FlowRun | null; running: boolean; stop: AbortController | null; say: string;
  /** what the last run worked out, which decides whether it is shown in 3D or as a line */ worked: Worked | null;
  /** what happened INSIDE each step, by its place in the run */ inside: Map<number, Trace[]>;
  /** the step the run is on right now, so the page can say so while it waits */ doing: string | null;
  /** the step whose call list is open, and what is being searched for in it */ picking: string | null; find: string;
}
const S: State = { store: null, at: null, view: 'wires', zoom: 1, panX: 0, panY: 0, picked: null, rel: 'connects', run: null, running: false, stop: null, say: '', worked: null, inside: new Map(), doing: null, picking: null, find: '' };

const board = (): Board | null => (S.at && S.store ? S.store.boards.get(S.at) ?? null : null);
const put = (p: Parameters<BoardStore['write']>[1]) => { if (S.at && S.store) S.store.write(S.at, p); };

/** Each step linked to the next, as `flows to` — what "link them in this order" writes, and what a run borrows
 *  when nothing has been drawn yet. */
function chainOf(order: string[]): Record<string, { from: string; to: string; rel: string }> {
  const out: Record<string, { from: string; to: string; rel: string }> = {};
  for (let i = 0; i + 1 < order.length; i++) out[`e${order[i]}_${order[i + 1]}`] = { from: order[i]!, to: order[i + 1]!, rel: 'flows to' };
  return out;
}

/** A new board, with its first page already on it so the page is never empty and never asks what a node is. */
function freshBoard(title: string): Board {
  const root = uid('n');
  return { title, nodes: { [root]: { label: 'first page', kind: 'page' } }, edges: {}, createdAt: Date.now(), updatedAt: Date.now() };
}

// ---- what is drawn ---------------------------------------------------------------------------------------------

/** THE PAGES OF A BOARD, and why a page is DECLARED rather than derived.
 *
 *  The first version read them off the derivation — a page was any node nothing was under. It is a tidy idea and it
 *  is wrong, found by driving the page: making two pages and then connecting a node on one to a node on the other
 *  took the count from 3 pages to 2, because `derive` re-roots its spanning tree by what is most connected, so a
 *  node that was a root stops being one the moment something links past it. A page that stops being a page when you
 *  use the board is not a page.
 *
 *  So a page says it is one (`kind: 'page'`), which is what `BoardNode.kind` is for, and nothing you connect can
 *  change that. Boards made before this have no declared page, so a node nothing is under still counts as one —
 *  that is the old rule kept as the fallback, not a second idea about what a page is. */
function pagesOf(b: Board, d: Derived): Live[] {
  const live = nodesOf(b);
  const declared = live.filter((n) => b.nodes[n.id]?.kind === 'page');
  if (declared.length) return declared;
  const kids = new Set<string>();
  for (const cs of d.kids.values()) for (const c of cs) kids.add(c);
  return live.filter((n) => !kids.has(n.id));
}

function nodeChip(b: Board, d: Derived, n: Live, pageId: string | null): string {
  const picked = S.picked === n.id;
  const linked = S.picked && S.picked !== n.id ? (d.nb.get(S.picked)?.has(n.id) ?? false) : false;
  const st = stepOf(b, n.id);
  return `<button class="chip ${picked ? 'picked' : ''} ${linked ? 'linked' : ''}" data-node="${n.id}" data-page="${pageId ?? ''}"
    title="${esc(levelOf(d, n.id))}, ${d.deg.get(n.id) ?? 0} link${(d.deg.get(n.id) ?? 0) === 1 ? '' : 's'}">
    <span class="lab">${esc(n.label)}</span>
    ${st ? `<span class="k k-${st.kind}">${esc(st.kind)}</span>` : ''}
    ${(d.deg.get(n.id) ?? 0) > 0 ? `<span class="deg">${d.deg.get(n.id)}</span>` : ''}
  </button>`;
}

/** THE BOARD AS WIRES, which is what a graph is for: you can see what branches from what. The bar above it is the
 *  same one the list has, so picking and connecting work identically in both — only the drawing differs. */
function wiresHtml(b: Board, d: Derived): string {
  return `${topBar(b, d)}
    <div class="wirewrap" id="wirewrap">${wiresSvg(b, d, { picked: S.picked, view: 'categories', zoom: S.zoom, panX: S.panX, panY: S.panY })}
      <div class="zoom"><button data-zoom="-">−</button><button data-zoom="0">fit</button><button data-zoom="+">+</button></div>
    </div>
    ${S.picked ? linksHtml(b, d) : ''}`;
}

function topBar(b: Board, d: Derived): string {
  const pages = pagesOf(b, d);
  const picked = S.picked ? nodesOf(b).find((n) => n.id === S.picked) : null;
  const elsewhere = edgesOf(b).filter((e) => d.root.get(e.from) !== d.root.get(e.to)).length;
  return `
  <div class="bar">
    <span class="says">${pages.length} page${pages.length === 1 ? '' : 's'} · ${nodesOf(b).length} nodes ·
      ${edgesOf(b).length} link${edgesOf(b).length === 1 ? '' : 's'}${elsewhere ? `, ${elsewhere} across pages` : ''}</span>
    <label class="rel">link as
      <select id="rel">${RELS.map((r) => `<option ${r === S.rel ? 'selected' : ''}>${r}</option>`).join('')}</select>
    </label>
  </div>
  ${picked ? `<div class="picked-bar">
      <b>${esc(picked.label)}</b> is picked — click another node to <b>${esc(S.rel)}</b> it, or click it again to let go.
      <button data-act="unpick">let go</button>
      <button data-act="dup">duplicate</button>
      <button data-act="del" class="danger">delete</button>
    </div>` : `<div class="picked-bar hintbar">Click a node to pick it, then click another to connect them — on this page or any other.</div>`}
  `;
}

function pagesHtml(b: Board, d: Derived): string {
  const pages = pagesOf(b, d);
  return `${topBar(b, d)}
  <div class="pages">
    ${pages.map((p) => {
      // what is ON the page: everything it was given, read off the board's own `contains` links rather than off the
      // derivation, for the same reason a page is declared — the derivation re-roots and would move nodes between
      // pages as you connect them.
      const under = edgesOf(b).filter((e) => e.from === p.id && (e.rel ?? 'connects') === 'contains')
        .map((e) => nodesOf(b).find((n) => n.id === e.to)).filter((n): n is Live => Boolean(n));
      return `<section class="page">
        <header>${nodeChip(b, d, p, null)}<span class="count">${under.length}</span></header>
        <div class="nodes">${under.map((n) => nodeChip(b, d, n, p.id)).join('') || '<span class="none">nothing on it yet</span>'}</div>
        <form class="add" data-under="${p.id}"><input placeholder="+ node" aria-label="add a node to ${esc(p.label)}" autocomplete="off"><button>+</button></form>
      </section>`;
    }).join('')}
    <section class="page new">
      <form class="add" data-under=""><input placeholder="+ new page" aria-label="add a page" autocomplete="off"><button>+</button></form>
    </section>
  </div>
  ${S.picked ? linksHtml(b, d) : ''}`;
}

/** Everything the picked node is joined to, so a graph can be read and not only made. */
function linksHtml(b: Board, d: Derived): string {
  const es = edgesOf(b).filter((e) => e.from === S.picked || e.to === S.picked);
  if (!es.length) return `<p class="none">It is joined to nothing yet.</p>`;
  const name = (id: string) => nodesOf(b).find((n) => n.id === id)?.label ?? id;
  return `<ul class="links">${es.map((e) => {
    const other = e.from === S.picked ? e.to : e.from;
    return `<li><span class="rel">${esc(e.rel ?? 'connects')}</span>
      <button data-node="${other}">${esc(name(other))}</button>
      <span class="where">${esc(name(d.root.get(other) ?? other))}</span></li>`;
  }).join('')}</ul>`;
}

/** THE ORDER THE STEPS RUN IN.
 *
 *  Where something links them in order — a `flows to`, a `feeds`, a `calls` — the engine's own `orderFrom` decides,
 *  and it must, because that is the flow the person drew. Where NOTHING does, `orderFrom` falls back to the
 *  hierarchy, which ranks by how connected each node is: six steps added one after another came out as
 *  `ask about it, how heavy?, make the body, pick a matter`. That is a correct answer to a question nobody asked.
 *
 *  With no order drawn, the order is the order they were MADE, which is what a person who typed them in means. It is
 *  only a reading: nothing is written to the board, and drawing a single `flows to` hands it straight back to the
 *  engine. The bar says which of the two is in force, so it is never a mystery. */
const ORDERED = new Set(['flows to', 'feeds', 'calls', 'feeds back to', 'depends on']);
export function runOrder(b: Board, d: Derived): { order: string[]; drawn: boolean } {
  const g = graphOf(b);
  const drawn = edgesOf(b).some((e) => ORDERED.has(e.rel ?? 'connects'));
  const trigs = triggersOf(b);
  const start = trigs[0]?.id ?? d.order[0];
  if (drawn && start) return { order: orderFrom(b, g, start), drawn: true };
  // as they were made: a board's nodes keep the order they were put in it
  const live = new Set(nodesOf(b).map((n) => n.id));
  const made = Object.keys(b.nodes).filter((id) => live.has(id));
  const first = trigs[0]?.id;
  return { order: first ? [first, ...made.filter((x) => x !== first)] : made, drawn: false };
}

function pipelineHtml(b: Board, d: Derived): string {
  const g = graphOf(b);
  const trigs = triggersOf(b);
  const { order, drawn } = runOrder(b, d);
  const name = (id: string) => nodesOf(b).find((n) => n.id === id)?.label ?? id;
  // what each step did on the last run, so the board carries the run rather than a list beneath it
  const ran = new Map<string, string>();
  for (const x of S.run?.steps ?? []) ran.set(x.node, x.status);
  const doing = S.running ? S.run?.steps.at(-1)?.node ?? order[0] ?? null : null;
  const picked = S.picked && order.includes(S.picked) ? S.picked : null;
  return `
  <div class="bar">
    <span class="says">${order.length} step${order.length === 1 ? '' : 's'}, ${drawn ? 'in the order you linked them' : 'in the order you made them'}${trigs.length ? `, from “${esc(trigs[0]!.label)}”` : ', with no trigger yet'}</span>
    <button id="run" ${S.running ? 'disabled' : ''}>${S.running ? 'running…' : '▶ Run'}</button>
    ${S.running ? '<button id="stoprun" class="danger">Stop</button>' : ''}
    ${drawn || order.length < 2 ? '' : '<button data-act="chain" class="small">link them in this order</button>'}
  </div>
  ${trigs.length ? '' : `<div class="picked-bar hintbar">A pipeline starts at a <b>trigger</b>. Click a step below and give it the
    kind “starts it” — “when I press run” is the plain one.</div>`}
  <div class="wirewrap flowwrap" id="wirewrap">${wiresSvg(b, d, {
    picked: S.picked, view: 'pipeline', zoom: S.zoom, panX: S.panX, panY: S.panY,
    flow: { order, step: (id) => stepOf(b, id), ran, doing },
  })}
    <div class="zoom"><button data-zoom="-">−</button><button data-zoom="0">fit</button><button data-zoom="+">+</button></div>
  </div>
  ${picked ? stepPanel(b, g, picked, name) : `<p class="none">Click a step on the board to change what it does. Drag one to move it;
    drag the board to pan.</p>`}
  ${S.worked ? showHtml(S.worked) : ''}${runHtml(S.run, S.inside, S.doing)}`;
}

/** THE PICKED STEP, OPENED UP BELOW THE BOARD: its name, what kind of step it is, what it does, and every call it
 *  could do instead. One step at a time, because the board above already says what the whole pipeline is — a list of
 *  every step's editor at once was the thing that stopped it looking like a board. */
function stepPanel(b: Board, g: ReturnType<typeof graphOf>, id: string, name: (id: string) => string): string {
  const st = stepOf(b, id);
  const kind = st?.kind ?? '';
  const after = (g.next.get(id) ?? []).map((x) => esc(name(x)));
  return `<div class="steppanel k-${kind || 'plain'}">
    <div class="row">
      <input class="lab" data-rename="${id}" value="${esc(name(id))}" aria-label="this step's name">
      <select data-kind="${id}" aria-label="what kind of step">
        <option value="" ${st ? '' : 'selected'}>— nothing, just a node</option>
        ${KINDS.map((k) => `<option value="${k}" ${kind === k ? 'selected' : ''}>${k} · ${KIND_SAYS[k]}</option>`).join('')}
      </select>
      <button class="from" data-from="${id}" title="run from here">▶ from here</button>
    </div>
    ${st ? `<input class="what wide" data-what="${id}" value="${esc(st.what)}" placeholder="${esc(SUGGEST[st.kind]?.[0]?.[0] ?? '')}" aria-label="what this step does">` : ''}
    ${st ? callsHtml(id, st.kind) : '<p class="none">Give it a kind and it becomes a step.</p>'}
    ${after.length ? `<span class="then">then ${after.join(', ')}</span>` : ''}
  </div>`;
}

/** EVERY CALL A STEP CAN MAKE, from the engine's own catalogue (`substrate/calls.ts`) rather than a handful chosen
 *  here — the same list the board in the headset offers, grouped by what each is for, each one written as it is said
 *  and ready to be changed. `calltest.ts` runs every one of them for real, so nothing is offered that does not work.
 *
 *  This is the difference between a pipeline you can learn from and one you can build with: a step is not a fixed
 *  menu of six things, it is anything the workshop can do, and a neural step (ask, check, repeat) sits beside a
 *  physical one (place, size, join, material, energy) on the same board. */
function callsHtml(id: string, kind: StepKind): string {
  const groups = CALLS.filter((g) => g.kind === kind);
  const quick = SUGGEST[kind]?.slice(0, 3) ?? [];
  if (!groups.length && !quick.length) return '';
  const open = S.picking === id;
  return `<div class="sug">
    ${quick.map(([w]) => `<button data-sug="${id}" data-text="${esc(w)}">${esc(w)}</button>`).join('')}
    <button data-pick="${id}" class="${open ? 'on' : ''}">${open ? 'close' : `every call · ${groups.reduce((n, g) => n + g.calls.length, 0)}`}</button>
  </div>
  ${open ? `<div class="calls">
    <input class="findcall" data-find="${id}" placeholder="find a call…" value="${esc(S.find)}" autocomplete="off">
    ${groups.map((g) => {
      const hits = g.calls.filter((c) => !S.find || `${c.label} ${c.text} ${c.says}`.toLowerCase().includes(S.find.toLowerCase()));
      return hits.length ? `<section><h4>${esc(g.name)}<span>${esc(g.says)}</span></h4>
        <ul>${hits.map((c) => `<li><button data-sug="${id}" data-text="${esc(c.text)}">
          <b>${esc(c.label)}</b><code>${esc(c.text)}</code><span>${esc(c.says)}</span></button></li>`).join('')}</ul></section>` : '';
    }).join('')}
  </div>` : ''}`;
}

function shell(): string {
  const bs: [string, Board][] = [...(S.store?.boards ?? new Map<string, Board>())].sort((a, c) => (c[1].updatedAt ?? 0) - (a[1].updatedAt ?? 0));
  const b = board(), d = b ? derive(b) : null;
  return `
  <aside class="rail">
    <a class="back" href="./index.html">← Nexus</a>
    <form id="newboard"><input placeholder="+ new board" autocomplete="off" aria-label="make a board"><button>+</button></form>
    <details class="learn">
      <summary>Start from a worked one</summary>
      <p class="hint">Each is a pipeline that already does something. Open it, read what it says to change, change
        that one step, and press ▶ Run. Then <b>copy</b> it and change it again — that is how you get your own.</p>
      <ul class="tpl">${TEMPLATES.map((t) => `<li><button data-tpl="${t.id}"><b>${esc(t.title)}</b><span>${esc(t.about)}</span></button></li>`).join('')}</ul>
    </details>
    <ul class="boards">${bs.map(([id, x]) => `<li><button class="${id === S.at ? 'on' : ''}" data-board="${id}">
      <b>${esc(x.title)}</b><span>${Object.values(x.nodes).filter((n) => !n.deleted).length} nodes</span></button></li>`).join('')}</ul>
    <p class="kept">${esc(S.store?.status() ?? '')}</p>
  </aside>
  <main>
    ${b && d ? `<header>
      <input id="title" value="${esc(b.title)}" aria-label="this board's name">
      <nav>${([['wires', 'Graph'], ['pages', 'Pages'], ['pipeline', 'Pipeline']] as const).map(([v, t]) => `<button data-view="${v}" class="${S.view === v ? 'on' : ''}">${t}</button>`).join('')}</nav>
      <button data-act="copyboard" class="small">copy</button>
      <button data-act="delboard" class="danger small">delete board</button>
    </header>
    ${S.say ? `<p class="said">${esc(S.say)}</p>` : ''}
    ${b.about ? `<details class="learn open" open><summary>What this one does, and what to change</summary><p>${esc(b.about)}</p></details>` : ''}
    ${S.view === 'wires' ? wiresHtml(b, d) : S.view === 'pages' ? pagesHtml(b, d) : pipelineHtml(b, d)}`
    : `<header><h1>Boards</h1></header>
       <p class="none">Make a board to start. A board holds pages; a page holds nodes; any node can be connected to
         any other, and the same nodes run as a pipeline.</p>`}
    ${mindBoxHtml()}
  </main>`;
}

// ---- what a click does -----------------------------------------------------------------------------------------

export function mountBoards(el: HTMLElement): void {
  const draw = () => { el.innerHTML = shell(); wireMindBox(el, draw); void mountScenes(el); };

  const pick = (id: string) => {
    const b = board(); if (!b) return;
    // on the pipeline board a click OPENS a step; connecting is what the graph board is for
    if (S.view === 'pipeline') { S.picked = S.picked === id ? null : id; S.picking = null; return draw(); }
    if (!S.picked) { S.picked = id; S.say = ''; return draw(); }
    if (S.picked === id) { S.picked = null; return draw(); }
    const t = toggleLink(b, S.picked, id, S.rel);
    if (t) {
      put(t.patch);
      const name = (x: string) => b.nodes[x]?.label ?? x;
      S.say = t.linked ? `${name(S.picked)} → ${name(id)}: ${S.rel}` : `${name(S.picked)} and ${name(id)} are no longer joined`;
    }
    S.picked = null; draw();
  };

  // dragging a card, and dragging the picture behind it. A press that does not move is left alone, so it lands as
  // the click that picks a node — that is what lets one gesture both arrange the board and connect it.
  el.addEventListener('pointerdown', (ev) => {
    const svg = (ev.target as Element).closest?.('svg.wires') as SVGSVGElement | null;
    if (!svg || ev.button !== 0) return;
    const card = (ev.target as Element).closest?.('[data-node]') as SVGGElement | null;
    if (card?.dataset.node) { dragCard(svg, card.dataset.node, ev, S.view === 'pipeline' ? 'pipeline' : 'categories', S.zoom, put, draw); return; }
    const sx = ev.clientX, sy = ev.clientY, px = S.panX, py = S.panY;
    const box = svg.viewBox.baseVal, rect = svg.getBoundingClientRect();
    const per = Math.max(box.width / rect.width, box.height / rect.height);
    const inner = svg.querySelector('g'); if (!inner) return;
    const move = (e: PointerEvent) => inner.setAttribute('transform', `translate(${(px + (e.clientX - sx) * per).toFixed(1)},${(py + (e.clientY - sy) * per).toFixed(1)}) scale(${S.zoom})`);
    const up = (e: PointerEvent) => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      S.panX = px + (e.clientX - sx) * per; S.panY = py + (e.clientY - sy) * per;
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  });

  el.addEventListener('wheel', (ev) => {
    if (!(ev.target as Element).closest?.('.wirewrap')) return;
    ev.preventDefault();
    S.zoom = Math.max(0.3, Math.min(4, S.zoom * (ev.deltaY < 0 ? 1.1 : 0.9)));
    draw();
  }, { passive: false });

  el.addEventListener('click', (ev) => {
    const t = (ev.target as HTMLElement).closest('[data-node],[data-board],[data-view],[data-act],[data-from],[data-sug],[data-zoom],[data-tpl],[data-pick],#run,#stoprun') as HTMLElement | null;
    if (!t) return;
    const z = t.dataset.zoom;
    if (z) { S.zoom = z === '0' ? 1 : Math.max(0.3, Math.min(4, S.zoom * (z === '+' ? 1.25 : 0.8))); if (z === '0') { S.panX = 0; S.panY = 0; } return draw(); }
    const b = board();
    if (t.dataset.node) return pick(t.dataset.node);
    if (t.dataset.board) { S.at = t.dataset.board; S.picked = null; S.run = null; S.say = ''; return draw(); }
    if (t.dataset.tpl) {
      const tpl = TEMPLATES.find((x) => x.id === t.dataset.tpl); if (!tpl) return;
      const id = uid('b'); S.store!.write(id, boardOfTemplate(tpl), true);
      S.at = id; S.view = 'pipeline'; S.picked = null; S.run = null;
      S.say = `“${tpl.title}” is yours now — change what it says to change, then press ▶ Run`;
      return draw();
    }
    if (t.dataset.view) { S.view = t.dataset.view as State['view']; S.picked = null; return draw(); }
    if (t.dataset.pick) { S.picking = S.picking === t.dataset.pick ? null : t.dataset.pick; S.find = ''; return draw(); }
    if (t.dataset.sug && t.dataset.text) { put({ nodes: { [t.dataset.sug]: { step: { kind: stepOf(b!, t.dataset.sug)!.kind, what: t.dataset.text } } } }); S.picking = null; return draw(); }
    if (t.id === 'run' && b) return start(b, null);
    if (t.id === 'stoprun') { S.stop?.abort(); return; }
    if (t.dataset.from && b) return start(b, t.dataset.from);
    const act = t.dataset.act;
    if (!b || !act) return;
    if (act === 'unpick') { S.picked = null; return draw(); }
    if (act === 'del' && S.picked) { put(deleteNode(b, S.picked)); S.picked = null; S.say = 'deleted'; return draw(); }
    if (act === 'dup' && S.picked) { const dd = duplicateNode(b, S.picked); if (dd) { put(dd.patch); S.say = `copied as “${dd.label}”`; } S.picked = null; return draw(); }
    // COPY THE WHOLE THING. `clipOf` takes a board's steps and the links between them, `pasteOf` lays them into a
    // new one with fresh ids — the same pair the headset copies a pipeline with, so a board copied here opens there.
    if (act === 'chain' && S.at) { put({ edges: chainOf(runOrder(b, derive(b)).order) }); S.say = 'linked in that order — you can drag the links about now'; return draw(); }
    if (act === 'copyboard' && S.at && S.store) {
      const clip = clipOf(b);
      const id = uid('b');
      const made: Board = { title: `${b.title} (a copy)`, about: b.about, nodes: {}, edges: {}, createdAt: Date.now(), updatedAt: Date.now() };
      const { patch } = pasteOf(clip);
      Object.assign(made.nodes, patch.nodes); Object.assign(made.edges, patch.edges);
      S.store.write(id, made, true);
      S.at = id; S.picked = null; S.run = null; S.say = 'copied — change anything on it without touching the first';
      return draw();
    }
    if (act === 'delboard' && S.at && S.store) {
      if (!confirmed(b.title)) return;
      S.store.remove(S.at); S.at = [...S.store.boards.keys()][0] ?? null; S.picked = null; return draw();
    }
  });

  el.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = ev.target as HTMLFormElement, box = f.querySelector('input')!, words = box.value.trim();
    if (!words) return;
    if (f.id === 'newboard') {
      const id = uid('b'); S.store!.write(id, freshBoard(words), true); S.at = id; S.view = 'wires'; S.picked = null;
      box.value = ''; return draw();
    }
    const b = board(); if (!b) return;
    const under = f.dataset.under || undefined;
    // one box, one node — a page is a node nothing is under, so "+ new page" and "+ node" are the same call with
    // and without a parent, which is why a page can later be put under another and simply becomes one.
    const a = addNode(freeName(b, words), under, uid('n'), 'contains');
    // a page says it is one, so connecting things can never demote it (see pagesOf)
    if (!under) a.patch.nodes![a.id]!.kind = 'page';
    put(a.patch); box.value = ''; S.say = under ? '' : `page “${words}” made`;
    draw();
  });

  el.addEventListener('input', (ev) => {
    const t = ev.target as HTMLInputElement;
    if (!t.dataset.find) return;
    S.find = t.value;
    const list = el.querySelector('.calls'); if (!list) return;
    // re-draw only the list, so the box keeps the cursor the person is typing in
    const b2 = board(); if (!b2) return;
    const st = stepOf(b2, t.dataset.find); if (!st) return;
    const holder = document.createElement('div');
    holder.innerHTML = callsHtml(t.dataset.find, st.kind);
    const fresh = holder.querySelector('.calls');
    if (fresh) { for (const sec of [...list.querySelectorAll('section')]) sec.remove(); for (const sec of fresh.querySelectorAll('section')) list.appendChild(sec); }
  });

  el.addEventListener('change', (ev) => {
    const t = ev.target as HTMLInputElement & HTMLSelectElement;
    if (t.dataset.find) return;
    const b = board(); if (!b) return;
    if (t.id === 'rel') { S.rel = t.value; return draw(); }
    if (t.id === 'title') { put({ title: t.value.trim() || b.title }); return draw(); }
    if (t.dataset.rename) { put({ nodes: { [t.dataset.rename]: { label: t.value.trim() || b.nodes[t.dataset.rename]!.label } } }); return draw(); }
    if (t.dataset.kind !== undefined && t.dataset.kind) {
      const kind = t.value as StepKind | '';
      const was = stepOf(b, t.dataset.kind);
      const step: Step | undefined = kind ? { kind, what: was?.what || SUGGEST[kind]?.[0]?.[0] || '' } : undefined;
      put({ nodes: { [t.dataset.kind]: { step: step ?? null as unknown as Step } } });
      return draw();
    }
    if (t.dataset.what) {
      const was = stepOf(b, t.dataset.what); if (!was) return;
      put({ nodes: { [t.dataset.what]: { step: { kind: was.kind, what: t.value } } } });
    }
  });

  async function start(b: Board, from: string | null): Promise<void> {
    const g = graphOf(b);
    const at = from ?? triggersOf(b)[0]?.id ?? runOrder(b, derive(b)).order[0];
    if (!at) { S.say = 'there is nothing to run'; return draw(); }
    const { order } = runOrder(b, derive(b));
    S.running = true; S.stop = new AbortController(); S.run = null; S.say = ''; S.worked = null;
    S.inside = new Map(); S.doing = b.nodes[at]?.label ?? null; draw();
    const hands = engineHands();
    try {
      // Each time a step finishes, everything the hands recorded since the last one belongs to THAT step. The
      // engine keeps no page state, so the matching is done here, by draining the trace as each step lands.
      let had = 0;
      // the engine walks the links, so a board with none gets the reading's order written onto a copy it runs from
      // — the person's board is untouched, and pressing "link them in this order" makes it theirs for good
      const { order: reading, drawn } = runOrder(b, derive(b));
      const ran: Board = drawn ? b : { ...b, edges: { ...b.edges, ...chainOf(reading) } };
      const r = await runFlow(ran, at, hands, from ? `pressed ▶ on “${b.nodes[at]?.label ?? at}”` : 'pressed ▶ Run',
        (live) => {
          while (had < live.steps.length) { S.inside.set(had, hands.trace.splice(0)); had++; }
          S.run = live;
          S.doing = live.steps.length < order.length ? (b.nodes[order[live.steps.length]!]?.label ?? null) : null;
          S.worked = hands.worked;          // so a shape made mid-run is already on screen
          draw();
        }, S.stop.signal);
      void g;
      S.run = r; S.worked = hands.worked;
      put({ runs: [...(b.runs ?? []).slice(-4), r] });
    } catch (e) { S.say = `the run stopped: ${(e as Error).message}`; }
    S.running = false; S.stop = null; S.doing = null; draw();
  }

  void (async () => {
    S.store = await makeBoardStore();
    S.store.subscribe(() => draw());
    if (!S.store.boards.size) {
      const id = uid('b');
      S.store.write(id, freshBoard('My first board'), true);
      S.at = id;
    } else S.at = [...S.store.boards.keys()][0]!;
    draw();
  })();
  el.innerHTML = '<p class="working">opening your boards…</p>';
}

/** Deleting a board cannot be undone, so it is asked for once. A page cannot show a dialog in every host, so this is
 *  a plain two-step: the second click inside four seconds is the yes. */
let armed: { title: string; at: number } | null = null;
function confirmed(title: string): boolean {
  if (armed && armed.title === title && Date.now() - armed.at < 4000) { armed = null; return true; }
  armed = { title, at: Date.now() };
  S.say = `click “delete board” again to delete “${title}” — it cannot be undone`;
  return false;
}
