// THE "TO CLAUDE" PAGE: everything you have asked for, and the blank page you draw on.
//
// Two halves of one idea. **Waiting** is the pile — each picture, drawing or note with what you asked for, newest
// first, each able to be copied out as one block of text Claude can be given. **Draw** is a blank page: draw the
// thing, say what it is, and it joins the pile.
//
// What it does NOT do, said plainly on the page rather than hidden: it does not send anything anywhere. The pile is
// in this browser. Claude reads it when you hand it over — by copying the block, or, where this app is open as an
// artifact with a shared store, by Claude being asked to look. A page that quietly uploaded your screen would be a
// different thing from the one you asked for.
//
// Owner of: the To Claude page and the drawing board on it.

import { all, drop, keep, put, type Item } from './inbox';

const esc = (s: unknown) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const when = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : new Date(t).toLocaleDateString();
};
const SORT: Record<Item['sort'], string> = { shot: 'a picture', drawing: 'a drawing', note: 'words' };

interface State { tab: 'waiting' | 'draw'; items: Item[]; urls: Map<string, string> }
const S: State = { tab: 'waiting', items: [], urls: new Map() };

/** One block of text per item, which is what you paste into Claude. The picture cannot go in the text, so it says
 *  the picture is attached and the person attaches it — honest about what a copy button can and cannot carry. */
export function asText(i: Item): string {
  return [
    `From the Nexus app — ${SORT[i.sort]}, ${new Date(i.at).toLocaleString()}${i.from ? `, taken on the ${i.from} page` : ''}.`,
    i.ask ? `What I want: ${i.ask}` : 'What I want: (not said yet)',
    i.png ? '(the picture is attached to this message)' : '',
  ].filter(Boolean).join('\n');
}

function waitingHtml(): string {
  if (!S.items.length) return `<p class="none">Nothing waiting. Press <kbd>⇧C</kbd> anywhere in the app to put a
    picture of what you are looking at here, paste one in, or draw something on the next tab.</p>`;
  return `<ul class="inbox">${S.items.map((i) => `<li class="${i.sent ? 'sent' : ''}" data-item="${i.id}">
    ${i.png ? `<img src="${S.urls.get(i.id) ?? ''}" alt="${esc(i.ask || SORT[i.sort])}">` : '<div class="noshot">words</div>'}
    <div class="body">
      <span class="meta">${SORT[i.sort]} · ${when(i.at)}${i.from ? ` · from ${esc(i.from)}` : ''}${i.sent ? ' · handed over' : ''}</span>
      <textarea data-ask="${i.id}" rows="2" placeholder="what do you want Claude to do with this?">${esc(i.ask)}</textarea>
      <div class="acts">
        <button data-copy="${i.id}">Copy for Claude</button>
        ${i.png ? `<a data-save="${i.id}" href="${S.urls.get(i.id) ?? ''}" download="nexus-${i.id}.png">Save the picture</a>` : ''}
        <button data-done="${i.id}">${i.sent ? 'put back' : 'handed over'}</button>
        <button data-del="${i.id}" class="danger">delete</button>
      </div>
    </div></li>`).join('')}</ul>`;
}

const drawHtml = (): string => `
  <div class="bar">
    <span class="says">Draw it. Then say what it is and send it over.</span>
    <label class="rel">pen <input type="range" id="pen" min="1" max="26" value="3"></label>
    <input type="color" id="ink" value="#e8edf4" aria-label="colour">
    <button id="undo" type="button">undo</button>
    <button id="clear" type="button" class="danger">clear</button>
  </div>
  <canvas id="pad" width="1400" height="900" aria-label="a blank page to draw on"></canvas>
  <form id="send"><input id="what" placeholder="what is it, and what should Claude do with it?" autocomplete="off"><button>Send it over</button></form>`;

function shell(): string {
  const waiting = S.items.filter((i) => !i.sent).length;
  return `
  <header>
    <a class="back" href="./index.html">← Nexus</a>
    <h1>To Claude</h1>
    <p class="lede">A picture of what you were doing, a drawing, or words — with what you want done about it.
      Press <kbd>⇧C</kbd> anywhere in the app to add one, or paste a picture straight in.</p>
    <nav>${([['waiting', `Waiting${waiting ? ` · ${waiting}` : ''}`], ['draw', 'Draw']] as const)
      .map(([v, t]) => `<button data-tab="${v}" class="${S.tab === v ? 'on' : ''}">${t}</button>`).join('')}</nav>
  </header>
  ${S.tab === 'waiting' ? waitingHtml() : drawHtml()}
  <footer><p>This pile is kept in this browser and is not sent anywhere on its own. Copy an item, or save its
    picture, and give it to Claude — that hand-over is yours to make, not the page's.</p></footer>`;
}

export function mountClaude(el: HTMLElement): void {
  const draw = async () => {
    for (const u of S.urls.values()) URL.revokeObjectURL(u);
    S.urls.clear();
    S.items = await all();
    for (const i of S.items) if (i.png) S.urls.set(i.id, URL.createObjectURL(i.png));
    el.innerHTML = shell();
    if (S.tab === 'draw') pad(el);
  };

  el.addEventListener('click', (ev) => {
    const t = (ev.target as HTMLElement).closest('[data-tab],[data-copy],[data-done],[data-del]') as HTMLElement | null;
    if (!t) return;
    if (t.dataset.tab) { S.tab = t.dataset.tab as State['tab']; return void draw(); }
    const i = S.items.find((x) => x.id === (t.dataset.copy ?? t.dataset.done ?? t.dataset.del));
    if (!i) return;
    if (t.dataset.copy) {
      void navigator.clipboard.writeText(asText(i)).then(() => { t.textContent = 'copied'; setTimeout(() => { t.textContent = 'Copy for Claude'; }, 1400); })
        .catch(() => { t.textContent = 'could not copy'; });
      return;
    }
    if (t.dataset.done) { void put({ ...i, sent: i.sent ? undefined : Date.now() }).then(draw); return; }
    if (t.dataset.del) { void drop(i.id).then(draw); }
  });

  el.addEventListener('change', (ev) => {
    const t = ev.target as HTMLTextAreaElement;
    if (!t.dataset.ask) return;
    const i = S.items.find((x) => x.id === t.dataset.ask);
    if (i) void put({ ...i, ask: t.value });
  });

  void draw();
}

/** The blank page. Strokes are kept so undo can drop the last one, and the picture is only made when it is sent. */
function pad(el: HTMLElement): void {
  const c = el.querySelector<HTMLCanvasElement>('#pad'); if (!c) return;
  const g = c.getContext('2d')!;
  const ink = el.querySelector<HTMLInputElement>('#ink')!, pen = el.querySelector<HTMLInputElement>('#pen')!;
  interface Stroke { ink: string; w: number; pts: [number, number][] }
  const strokes: Stroke[] = [];
  const paint = () => {
    g.fillStyle = '#0a0d12'; g.fillRect(0, 0, c.width, c.height);
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const s of strokes) {
      g.strokeStyle = s.ink; g.lineWidth = s.w; g.beginPath();
      s.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      if (s.pts.length === 1) { g.lineTo(s.pts[0]![0] + 0.1, s.pts[0]![1]); }
      g.stroke();
    }
  };
  paint();
  const at = (e: PointerEvent): [number, number] => {
    const r = c.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * c.width, ((e.clientY - r.top) / r.height) * c.height];
  };
  c.addEventListener('pointerdown', (e) => {
    c.setPointerCapture(e.pointerId);
    const s: Stroke = { ink: ink.value, w: Number(pen.value), pts: [at(e)] };
    strokes.push(s); paint();
    const move = (m: PointerEvent) => { s.pts.push(at(m)); paint(); };
    const up = () => { c.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    c.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  });
  el.querySelector('#undo')!.addEventListener('click', () => { strokes.pop(); paint(); });
  el.querySelector('#clear')!.addEventListener('click', () => { strokes.length = 0; paint(); });
  el.querySelector('#send')!.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const what = el.querySelector<HTMLInputElement>('#what')!;
    if (!strokes.length) return;
    c.toBlob((png) => {
      if (!png) return;
      void keep('drawing', png, what.value.trim(), 'the drawing board').then(() => {
        strokes.length = 0; paint(); what.value = ''; S.tab = 'waiting';
        el.dispatchEvent(new Event('redraw'));
        mountClaude(el);
      });
    }, 'image/png');
  });
}
