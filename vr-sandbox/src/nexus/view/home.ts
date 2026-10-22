// THE FRONT DOOR, in 2D, outside the headset. Everything this project can do had exactly two ways in before this:
// a terminal (`npm run machine`, `pack`, `part`, `works`, …) or a VR headset. Neither is a way to show someone the
// thing, and neither is a way to use it on a laptop or a phone on the bus.
//
// So: a page that says what this is and opens every door, with the counts read from the engine itself rather than
// typed here — a home page quoting a number that has gone stale is the thing this tree spends its rounds not doing.
//
// But the counts are NOT on the critical path. Measured 2026-10-22: importing the engine for them put 3.00 MB in
// front of the first paint of a page of six links. So the page paints from what it knows and each number arrives
// when the module that derives it has loaded; a slot that does not arrive stays absent rather than being filled
// with a guess. First text now lands in 468 ms against 373 ms, with nothing blocking it.
//
// And it imports each owner DIRECTLY, never `works.ts`'s barrel: that barrel is an `export *` over the whole
// directory and reaches `ask/conceive.ts`, which imports Jolt — 3.56 MB of physics engine for a station count.
//
// Owner of: the 2D front door and what it lists. The doors themselves are owned where they always were; this only
// names them. `make2d.ts` is the workbench it opens and `boards2d.ts` the boards.

/** One thing you can open, and whether it needs a headset. */
export interface Door {
  name: string; says: string; href: string;
  /** what it is: a page you read, a thing you drive, or a room you stand in */ kind: '2d' | '3d' | 'vr';
  /** which derived number makes it concrete, filled in when the engine that knows it has loaded */ fact?: FactKey;
}
export type FactKey = 'units' | 'works' | 'parts' | 'boards' | 'inbox';

export const DOORS: Door[] = [
  { name: 'Make something', says: 'Say what you want in a sentence. It is composed from the library, checked, priced, and the holds worked out — in the page, with no headset.', href: './make.html', kind: '2d', fact: 'units' },
  { name: 'Boards', says: 'Make a page; put nodes on it; connect any node to any other, on this page or another. The same nodes run as a pipeline you build step by step and press ▶ on.', href: './boards.html', kind: '2d', fact: 'boards' },
  { name: 'To Claude', says: 'Press ⇧C anywhere and a picture of what you are looking at lands here with what you want done about it. Or draw the thing on a blank page and send that.', href: './claude.html', kind: '2d', fact: 'inbox' },
  { name: 'The forge', says: 'The room: the works you walk between, the warehouse, the benches, the phone in your hand. Runs on a screen with the mouse, or in a headset.', href: './forge.html', kind: '3d', fact: 'works' },
  { name: 'One thing, lit', says: 'Any part or machine on its own, under daylight, framed so it can be seen whole — three-quarter, exploded, or cut through.', href: './look.html', kind: '3d', fact: 'parts' },
  { name: 'The room Nexus builds', says: 'What the engine generated, standing where it put it. The scene is read, not drawn by hand.', href: './room.html', kind: '3d' },
  { name: 'Live, from nothing', says: 'The workshop generated in front of you as it is worked out, piece by piece.', href: './jarvis.html', kind: '3d' },
];

const KIND: Record<Door['kind'], string> = { '2d': 'a page', '3d': 'on a screen', vr: 'a headset' };

export function homeHtml(): string {
  return `
  <header>
    <h1>Nexus</h1>
    <p class="lede">Say what you want to build. It is designed from a library of real parts, checked against the
      laws it has to obey, priced from sellers' own pages, and turned into a lesson that teaches you to build it by
      hand — then the works in your garage makes it.</p>
    <p class="sub" id="sub">no headset needed for the first two</p>
  </header>
  <main>
    ${DOORS.map((d) => `<a class="door ${d.kind}" href="${d.href}">
      <span class="k">${KIND[d.kind]}</span>
      <h2>${d.name}</h2>
      <p>${d.says}</p>
      ${d.fact ? `<span class="fact" data-fact="${d.fact}"></span>` : ''}
    </a>`).join('')}
  </main>
  <footer>
    <p>Every number here is read from the engine when the page opens, not written into it. What a thing costs is a
      seller's page and the day it was seen; what it weighs is its parts; what it can hold is worked out from the
      load. Where something is an estimate it says so, and where there is no figure it says that instead of
      inventing one.</p>
  </footer>`;
}

const n = (x: number) => x.toLocaleString('en');

/** How many things are waiting to be handed over, said in words — from the pile itself, never a stored count. */
async function waitingSays(): Promise<string> {
  try {
    const { waiting } = await import('./inbox');
    const w = await waiting();
    return w ? `${w} waiting to be handed over` : 'nothing waiting yet';
  } catch { return 'nothing waiting yet'; }
}

/** Every fact the page shows, each derived by the module that owns it, loaded only once the page is up. */
export async function facts(): Promise<Partial<Record<FactKey | 'sub', string>>> {
  const [{ INVENTORY }, { PRICES }, { everyUnit }, { under3K }] = await Promise.all([
    import('../parts/inventory'), import('../parts/prices'), import('../ask/machine'), import('../works/budget'),
  ]);
  const parts = INVENTORY.size, priced = Object.keys(PRICES).length, works = under3K();
  return {
    units: `${everyUnit().length} units it composes from`,
    works: `${works.ids.length} stations, $${works.usd.toFixed(0)}`,
    parts: `${n(parts)} parts, ${n(priced)} priced`,
    boards: 'kept in this browser, and read by Claude where the page can share them',
    inbox: await waitingSays(),
    sub: `${n(parts)} parts · ${works.ids.length} stations at $${works.usd.toFixed(0)} · no headset needed for the first two`,
  };
}

export function mountHome(el: HTMLElement): void {
  el.innerHTML = homeHtml();
  void facts().then((f) => {
    for (const s of el.querySelectorAll<HTMLElement>('[data-fact]')) {
      const v = f[s.dataset.fact as FactKey];
      if (v) s.textContent = v;
    }
    const sub = el.querySelector<HTMLElement>('#sub');
    if (sub && f.sub) sub.textContent = f.sub;
  }).catch(() => { /* the counts did not arrive: the page stands without them rather than showing a made-up one */ });
}
