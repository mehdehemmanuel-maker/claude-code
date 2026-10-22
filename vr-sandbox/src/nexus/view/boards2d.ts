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
import { SUGGEST, TEMPLATES, boardOfTemplate, clipOf, graphOf, orderFrom, pasteOf, runFlow, stepOf, triggersOf, type FlowRun, type Step, type StepKind } from '../substrate/flows';
import { engineHands, runHtml, type Worked } from './flow2d';
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
}
const S: State = { store: null, at: null, view: 'wires', zoom: 1, panX: 0, panY: 0, picked: null, rel: 'connects', run: null, running: false, stop: null, say: '', worked: null };

const board = (): Board | null => (S.at && S.store ? S.store.boards.get(S.at) ?? null : null);
const put = (p: Parameters<BoardStore['write']>[1]) => { if (S.at && S.store) S.store.write(S.at, p); };

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

function pipelineHtml(b: Board, d: Derived): string {
  const g = graphOf(b);
  const trigs = triggersOf(b);
  const start = trigs[0]?.id ?? d.order[0];
  const order = start ? orderFrom(b, g, start) : nodesOf(b).map((n) => n.id);
  const name = (id: string) => nodesOf(b).find((n) => n.id === id)?.label ?? id;
  return `
  <div class="bar">
    <span class="says">${order.length} step${order.length === 1 ? '' : 's'} in the order they are derived${trigs.length ? `, starting at “${esc(trigs[0]!.label)}”` : ', with no trigger yet'}</span>
    <button id="run" ${S.running ? 'disabled' : ''}>${S.running ? 'running…' : '▶ Run'}</button>
    ${S.running ? '<button id="stoprun" class="danger">Stop</button>' : ''}
  </div>
  ${trigs.length ? '' : `<div class="picked-bar hintbar">A pipeline starts at a <b>trigger</b>. Give a step the kind
    “starts it” and say when — “when I press run” is the plain one.</div>`}
  <ol class="flow">
    ${order.map((id, i) => {
      const st = stepOf(b, id);
      const kind = st?.kind ?? '';
      return `<li data-step="${id}">
        <span class="n">${i + 1}</span>
        <div class="card ${kind ? `k-${kind}` : 'plain'}">
          <input class="lab" data-rename="${id}" value="${esc(name(id))}" aria-label="this step's name">
          <div class="row">
            <select data-kind="${id}" aria-label="what kind of step">
              <option value="" ${st ? '' : 'selected'}>— nothing, just a node</option>
              ${KINDS.map((k) => `<option value="${k}" ${kind === k ? 'selected' : ''}>${k} · ${KIND_SAYS[k]}</option>`).join('')}
            </select>
            ${st ? `<input class="what" data-what="${id}" list="sug-${st.kind}" value="${esc(st.what)}" placeholder="${esc(SUGGEST[st.kind]?.[0]?.[0] ?? '')}" aria-label="what this step does">` : ''}
          </div>
          ${st && SUGGEST[st.kind] ? `<div class="sug">${SUGGEST[st.kind]!.slice(0, 4).map(([w]) => `<button data-sug="${id}" data-text="${esc(w)}">${esc(w)}</button>`).join('')}</div>` : ''}
          ${(g.next.get(id) ?? []).length ? `<span class="then">then ${(g.next.get(id) ?? []).map((x) => esc(name(x))).join(', ')}</span>` : ''}
        </div>
        <button class="from" data-from="${id}" title="run from here">▶</button>
      </li>`;
    }).join('')}
  </ol>
  ${KINDS.map((k) => `<datalist id="sug-${k}">${(SUGGEST[k] ?? []).map(([w, why]) => `<option value="${esc(w)}">${esc(why)}</option>`).join('')}</datalist>`).join('')}
  ${S.worked ? showHtml(S.worked) : ''}${runHtml(S.run)}`;
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
    if (card?.dataset.node) { dragCard(svg, card.dataset.node, ev, 'categories', S.zoom, put, draw); return; }
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
    const t = (ev.target as HTMLElement).closest('[data-node],[data-board],[data-view],[data-act],[data-from],[data-sug],[data-zoom],[data-tpl],#run,#stoprun') as HTMLElement | null;
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
    if (t.dataset.sug && t.dataset.text) { put({ nodes: { [t.dataset.sug]: { step: { kind: stepOf(b!, t.dataset.sug)!.kind, what: t.dataset.text } } } }); return draw(); }
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

  el.addEventListener('change', (ev) => {
    const t = ev.target as HTMLInputElement & HTMLSelectElement;
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
    const at = from ?? triggersOf(b)[0]?.id ?? derive(b).order[0];
    if (!at) { S.say = 'there is nothing to run'; return draw(); }
    void g;
    S.running = true; S.stop = new AbortController(); S.run = null; S.say = ''; S.worked = null; draw();
    const hands = engineHands();
    try {
      const r = await runFlow(b, at, hands, from ? `pressed ▶ on “${b.nodes[at]?.label ?? at}”` : 'pressed ▶ Run',
        (live) => { S.run = live; draw(); }, S.stop.signal);
      S.run = r; S.worked = hands.worked;
      put({ runs: [...(b.runs ?? []).slice(-4), r] });
    } catch (e) { S.say = `the run stopped: ${(e as Error).message}`; }
    S.running = false; S.stop = null; draw();
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
