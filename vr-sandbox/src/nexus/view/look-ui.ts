// CONTROLS FOR THE LOOK PAGE, which had none.
//
// `view/look.ts` can do a great deal — frame a thing from any side, take it apart level by level, cut through it,
// ghost everything but one part, throw zebra stripes across its skin to read its curvature, colour each panel by how
// it leaves its die, name the part under your finger. Every one of those was a URL parameter I drove from
// `tools/forge-look.mjs` to take screenshots with. The page itself had nothing on it but a canvas: no picker, no
// views, no way in. It was a render target for my own tooling, put on the front door as though it were a feature.
//
// This is the interface it never had. It changes nothing about what the page can do — it only makes it reachable,
// by setting the same parameters and reloading. A reload is honest here: the whole thing is rebuilt from what you
// asked for, so what you see is always what the parameters say, with no half-applied state.
//
// Owner of: the look page's controls.

import { KITS } from '../parts/kits';

const esc = (s: unknown) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const q = () => new URLSearchParams(location.search);

/** Where you can stand. `look.ts` takes these names directly. */
const VIEWS: [string, string][] = [
  ['three', 'three-quarter'], ['front', 'front'], ['side', 'side'], ['rear', 'rear'], ['top', 'top'], ['under', 'underneath'],
];

/** The things it can be asked to show about a thing, each one `look.ts` already does. */
const TOOLS: { key: string; on: string; label: string; says: string }[] = [
  { key: 'explode', on: '2', label: 'exploded', says: 'taken apart, two levels down' },
  { key: 'cut', on: 'z<0', label: 'cut through', says: 'the near half removed, the section hatched' },
  { key: 'ghost', on: '1', label: 'ghosted', says: 'everything faint but what is picked out' },
  { key: 'zebra', on: '1', label: 'zebra', says: 'stripes reflected in its skin: they run smoothly only where its curvature does' },
  { key: 'draft', on: '1', label: 'draft', says: 'each panel by how it leaves its die — green clean, yellow barely, red undercut' },
  { key: 'holes', on: '1', label: 'gaps', says: 'every gap you can see through, in green' },
  { key: 'room', on: '1', label: 'room light', says: 'a room\'s light instead of the studio\'s' },
];

const go = (set: (p: URLSearchParams) => void) => { const p = q(); set(p); location.search = p.toString(); };

export function mountLookUi(): void {
  const now = q(), kit = now.get('kit') ?? 'car', view = now.get('view') ?? 'three';
  const bar = document.createElement('div');
  bar.className = 'lookbar';
  bar.innerHTML = `
    <div class="row">
      <a class="back" href="./index.html">← Nexus</a>
      <label>look at
        <select id="lkkit">${[...KITS].sort((a, b) => a.name.localeCompare(b.name))
          .map((k) => `<option value="${esc(k.id)}" ${k.id === kit ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}</select>
      </label>
      <label>from
        <select id="lkview">${VIEWS.map(([v, t]) => `<option value="${v}" ${v === view ? 'selected' : ''}>${t}</option>`).join('')}</select>
      </label>
      <span class="says" id="lksays"></span>
      <a class="board" href="./boards.html">put it on a board →</a>
    </div>
    <div class="row tools">
      ${TOOLS.map((t) => `<button type="button" data-tool="${t.key}" class="${now.get(t.key) ? 'on' : ''}" title="${esc(t.says)}">${t.label}</button>`).join('')}
      ${[...now.keys()].some((k) => TOOLS.some((t) => t.key === k)) ? '<button type="button" data-tool="none" class="clear">plain again</button>' : ''}
    </div>
    <div class="parts" id="lkparts"></div>`;
  document.body.appendChild(bar);

  bar.querySelector('#lkkit')!.addEventListener('change', (e) => go((p) => p.set('kit', (e.target as HTMLSelectElement).value)));
  bar.querySelector('#lkview')!.addEventListener('change', (e) => go((p) => p.set('view', (e.target as HTMLSelectElement).value)));
  for (const b of bar.querySelectorAll<HTMLElement>('[data-tool]')) {
    b.addEventListener('click', () => {
      const k = b.dataset.tool!;
      if (k === 'none') return go((p) => { for (const t of TOOLS) p.delete(t.key); });
      const t = TOOLS.find((x) => x.key === k)!;
      go((p) => (p.get(k) ? p.delete(k) : p.set(k, t.on)));
    });
  }

  // WHAT IT IS, read from the page itself once it has drawn — `look.ts` puts `parts()` and `facts()` on window for
  // exactly this, and until now only my screenshot script ever called them.
  const look = (window as unknown as { look?: { parts(): { name: string; material?: string }[]; facts?(): Record<string, unknown> } }).look;
  const tell = () => {
    const says = document.getElementById('lksays'), list = document.getElementById('lkparts');
    if (!look || !says || !list) return false;
    let ps: { name: string; material?: string }[] = [];
    try { ps = look.parts(); } catch { return false; }
    if (!ps.length) return false;
    says.textContent = `${ps.length} part${ps.length === 1 ? '' : 's'} drawn`;
    const mats = [...new Set(ps.map((p) => p.material).filter(Boolean))];
    list.innerHTML = `<b>${ps.length} parts</b>${mats.length ? ` · ${mats.slice(0, 6).join(', ')}${mats.length > 6 ? ` and ${mats.length - 6} more` : ''}` : ''}
      <span class="names">${ps.slice(0, 40).map((p) => esc(p.name)).join(' · ')}${ps.length > 40 ? ` · and ${ps.length - 40} more` : ''}</span>`;
    return true;
  };
  // it is drawn on its own clock, so look for it rather than assume: give up after ten seconds and say nothing
  let tries = 0;
  const tick = setInterval(() => { if (tell() || ++tries > 40) clearInterval(tick); }, 250);
}
