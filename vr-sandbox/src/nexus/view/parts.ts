// The parts browser (decision 0026, the user 2026-11-06: "really populate the library ... and organize it better for
// navigation"): every piece in the library by its trade (chips), then its category, then its family with every size its
// table has, and a search box that finds a part by what it is or its size ("M8 nut", "608 bearing", "2x4", "Raspberry
// Pi 4") through the catalogue (navigate.ts partsCatalogue, findParts). A size tapped is handed to the page that opened
// it, which adds the piece as its by-hand step does: the phone page (vibe.ts) into its by-hand form and onto what is
// there by the operation chosen (agent.ts joinPlan), the dashboard (dashboard.ts) placed on the board and shown. The tree
// is worked out apart from the page (partsTree), so a test holds it; nothing here runs until a page mounts it.

import { findParts, partsCatalogue, type PartEntry, type PartHit } from '../navigate';
import { block, defaultsOf } from '../blocks';
import { placeBlock, wire } from '../dataflow';
import type { Board } from '../boards';

/** What the browser shows: the trades (the one open marked), the open trade's categories with their families and sizes,
 *  and, where something is searched, what it finds. */
export interface PartsTree {
  trades: { name: string; families: number; sizes: number }[];
  trade: string;
  categories: { name: string; families: { id: string; name: string; sizes: string[]; envelope: boolean }[] }[];
  hits: PartHit[];
  total: { families: number; sizes: number };
}
const envelopeOf = (e: PartEntry) => /an envelope/i.test(e.says);
/** The browser's tree for a trade (the first where none or an unknown one is named) and a search (none where blank). */
export function partsTree(o: { trade?: string; q?: string } = {}): PartsTree {
  const cat = partsCatalogue(), open = cat.find((t) => t.name === o.trade) ?? cat[0];
  return { trades: cat.map((t) => ({ name: t.name, families: t.families, sizes: t.sizes })), trade: open?.name ?? '',
    categories: (open?.categories ?? []).map((c) => ({ name: c.name, families: c.families.map((f) => ({ id: f.id, name: f.name, sizes: f.sizes, envelope: envelopeOf(f) })) })),
    hits: o.q?.trim() ? findParts(o.q, 24) : [],
    total: { families: cat.reduce((n, t) => n + t.families, 0), sizes: cat.reduce((n, t) => n + t.sizes, 0) } };
}

/** A piece put on a board as the dashboard adds one: its node at its size, and shown (a "Show in space" node fed by it),
 *  so it is seen at once; the node's id back. */
export function addPiece(b: Board, id: string, set: Record<string, unknown>): string {
  const d = block(id); if (!d) throw new Error(`no block ${id}`);
  const n = Object.keys(b.nodes).length, node = placeBlock(b, id, 40 + (n % 6) * 30, 40 + n * 24, { ...defaultsOf(d), ...set });
  wire(b, node, 'thing', placeBlock(b, 'space.show', 380 + (n % 6) * 30, 40 + n * 24, {}), 'thing');
  return node;
}

const STYLE = `
.pb-ov{position:fixed;inset:0;z-index:60;display:none;flex-direction:column;background:#0b0f17;color:#e6edf3;font:14px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;padding:calc(env(safe-area-inset-top) + 10px) 0 calc(env(safe-area-inset-bottom) + 6px)}
.pb-ov.on{display:flex}
.pb-hd{display:flex;align-items:center;gap:8px;padding:0 14px 8px}
.pb-hd b{font-size:17px}.pb-hd .n{color:#8b98a9;font-size:12px;flex:1}
.pb-hd button,.pb-keep{background:#1b2433;border:1px solid #2b3648;color:#e6edf3;border-radius:10px;padding:6px 10px;font:inherit}
.pb-q{margin:0 14px 8px;padding:10px 12px;border-radius:12px;border:1px solid #2b3648;background:#121926;color:#e6edf3;font:inherit;font-size:16px}
.pb-tr{display:flex;gap:6px;overflow-x:auto;padding:0 14px 8px;flex:none;scrollbar-width:none}
.pb-tr::-webkit-scrollbar{display:none}
.pb-tr button{flex:none;background:#151d2b;border:1px solid #2b3648;color:#c9d4e2;border-radius:999px;padding:6px 12px;font:inherit;font-size:13px}
.pb-tr button.on{background:#5ad1ff22;border-color:#5ad1ff;color:#fff}
.pb-tr button i{font-style:normal;color:#8b98a9;margin-left:4px;font-size:11px}
.pb-ls{flex:1;overflow-y:auto;padding:0 14px 14px}
.pb-ls h4{margin:12px 0 6px;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#8b98a9}
.pb-f{background:#121926;border:1px solid #1f2838;border-radius:12px;padding:8px 10px;margin:0 0 6px}
.pb-f .t{display:flex;gap:6px;align-items:baseline}.pb-f .t span{flex:1;font-weight:600}.pb-f .t em{font-style:normal;font-size:11px;color:#8b98a9}
.pb-sz{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}
.pb-sz button{background:#1b2433;border:1px solid #2b3648;color:#e6edf3;border-radius:8px;padding:5px 8px;font:inherit;font-size:12.5px}
.pb-sz button.more{color:#5ad1ff}
.pb-sz button:active{background:#5ad1ff33}
.pb-none{color:#8b98a9;padding:10px 0}
`;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
/** The sizes a family row shows before "more" opens the rest. */
const FIRST_SIZES = 18;

/**
 * The browser mounted on a page, closed until opened: by `trigger` (its own press then opens the browser; what it did
 * before is kept as a button in the browser, named `keepAs`), or by a button put at the end of `into`. A size (or a
 * family that has none) tapped is handed to `add` with the piece's node and its settings, and the browser closes.
 */
export function mountParts(o: { trigger?: HTMLElement; keepAs?: string; into?: HTMLElement; label?: string; add: (id: string, set: Record<string, unknown>) => unknown }): { open: () => void; close: () => void; tree: () => PartsTree } {
  if (!document.getElementById('pb-style')) { const st = document.createElement('style'); st.id = 'pb-style'; st.textContent = STYLE; document.head.appendChild(st); }
  const ov = document.createElement('div'); ov.className = 'pb-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Parts');
  const kept = o.trigger?.onclick ?? null;
  ov.innerHTML = `<div class="pb-hd"><b>Parts</b><span class="n"></span>${kept && o.keepAs ? `<button class="pb-keep">${esc(o.keepAs)}</button>` : ''}<button class="pb-x" aria-label="Close">✕</button></div><input class="pb-q" type="search" placeholder="Find a part: M8 nut, 608 bearing, 2x4, Raspberry Pi 4" enterkeyhint="search"><div class="pb-tr"></div><div class="pb-ls"></div>`;
  document.body.appendChild(ov);
  const q = ov.querySelector<HTMLInputElement>('.pb-q')!, tr = ov.querySelector<HTMLElement>('.pb-tr')!, ls = ov.querySelector<HTMLElement>('.pb-ls')!;
  let trade = '', opened = new Set<string>(), tree = partsTree();
  const sizeBtn = (id: string, size: string | undefined, label: string) => `<button data-id="${esc(id)}"${size !== undefined ? ` data-size="${esc(size)}"` : ''}>${esc(label)}</button>`;
  const famRow = (f: PartsTree['categories'][number]['families'][number]) => { const all = opened.has(f.id), shown = all ? f.sizes : f.sizes.slice(0, FIRST_SIZES);
    return `<div class="pb-f"><div class="t"><span>${esc(f.name)}</span><em>${f.sizes.length ? `${f.sizes.length} size${f.sizes.length === 1 ? '' : 's'}` : 'any size'}${f.envelope ? ' · outline' : ''}</em></div><div class="pb-sz">${f.sizes.length ? shown.map((s) => sizeBtn(f.id, s, s)).join('') : sizeBtn(f.id, undefined, '＋ Add')}${!all && f.sizes.length > FIRST_SIZES ? `<button class="more" data-more="${esc(f.id)}">+${f.sizes.length - FIRST_SIZES} more</button>` : ''}</div></div>`; };
  const draw = () => {
    tree = partsTree({ trade, q: q.value }); trade = tree.trade;
    ov.querySelector('.pb-hd .n')!.textContent = `${tree.total.families} families · ${tree.total.sizes} sizes`;
    tr.innerHTML = tree.trades.map((t) => `<button data-trade="${esc(t.name)}" class="${t.name === trade && !q.value.trim() ? 'on' : ''}">${esc(t.name)}<i>${t.families}</i></button>`).join('');
    if (q.value.trim()) {
      ls.innerHTML = tree.hits.length ? `<h4>Found</h4>${tree.hits.map((h) => `<div class="pb-f"><div class="t"><span>${esc(h.name)}${h.size ? ` ${esc(h.size)}` : ''}</span><em>${esc(h.aisle)}</em></div><div class="pb-sz">${h.size ? sizeBtn(h.id, h.size, `＋ ${h.size}`) : (() => { const f = tree.categories.flatMap((c) => c.families).find((x) => x.id === h.id); const sizes = f?.sizes ?? (block(h.id)?.settings ?? []).find((s) => s.key === 'size')?.choices?.map(String) ?? []; return sizes.length ? sizes.slice(0, FIRST_SIZES).map((s) => sizeBtn(h.id, s, s)).join('') : sizeBtn(h.id, undefined, '＋ Add'); })()}</div></div>`).join('')}` : '<div class="pb-none">Nothing found: try what it is (nut, bearing, valve) or its size (M8, 608, DN20).</div>';
    } else ls.innerHTML = tree.categories.map((c) => `<h4>${esc(c.name)} · ${c.families.length}</h4>${c.families.map(famRow).join('')}`).join('');
  };
  const open = () => { ov.classList.add('on'); draw(); }, close = () => ov.classList.remove('on');
  ov.addEventListener('click', (e) => { const t = (e.target as HTMLElement).closest('button'); if (!t) return;
    if (t.classList.contains('pb-x')) { close(); return; }
    if (t.classList.contains('pb-keep')) { close(); kept?.call(o.trigger!, e as PointerEvent); return; }
    if (t.dataset.trade) { trade = t.dataset.trade; q.value = ''; draw(); ls.scrollTop = 0; return; }
    if (t.dataset.more) { opened.add(t.dataset.more); draw(); return; }
    if (t.dataset.id) { close(); void o.add(t.dataset.id, t.dataset.size !== undefined ? { size: t.dataset.size } : {}); } });
  q.addEventListener('input', draw);
  ov.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  if (o.trigger) { o.trigger.onclick = open; o.trigger.title = `Parts: every piece by trade, category and size${o.keepAs ? ` (${o.keepAs} is in it)` : ''}`; }
  if (o.into) { const b = document.createElement('button'); b.textContent = o.label ?? '＋ Parts'; b.title = 'Every piece in the library, by trade, category and size; tap a size to add it'; b.onclick = open; o.into.appendChild(b); }
  opened = new Set(); return { open, close, tree: () => tree };
}
