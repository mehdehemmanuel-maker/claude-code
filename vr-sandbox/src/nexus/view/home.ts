// THE FRONT DOOR, in 2D, outside the headset. Everything this project can do had exactly two ways in before this:
// a terminal (`npm run machine`, `pack`, `part`, `works`, …) or a VR headset. Neither is a way to use it on a
// laptop or a phone.
//
// WHAT WAS CUT FROM IT, 2026-10-22, and why — the user asked for anything fake deleted, and four things were:
//   - "then the works in your garage makes it". The works is a $2,395 bill of stations you would have to buy and
//     build, and three of its sixteen are still bare stand-ins. Nothing of it is in anyone's garage.
//   - "turned into a lesson that teaches you to build it by hand". CLAUDE.md's own open list says every pack still
//     ships a generic "Put it together", which is the thing ask 4 forbids by name. The lessons exist; that claim
//     about them does not hold yet, so it is gone until it does.
//   - "read by Claude where the page can share them", of the boards. Served from GitHub Pages there is no shared
//     store at all, and `boards-store.ts` itself says so on the page: Claude cannot read them. Half a sentence that
//     was true in one deployment and false in the one he actually opens.
//   - "no headset needed for the first two", which was typed and had gone stale the moment a third 2D page landed.
//     It is counted now.
// "Any part or machine" became what the library actually draws, which is 116 designs over 9,074 catalogue sizes
// out of an inventory of ~2,400 — a real number instead of the word "any".
//
// The counts are NOT on the critical path. Measured: importing the engine for them put 3.00 MB in front of the
// first paint. So the page paints from what it knows and each number arrives when the module that derives it has
// loaded; a slot that does not arrive stays absent rather than being filled with a guess. And it imports each owner
// DIRECTLY, never `works.ts`'s barrel, which reaches `ask/conceive.ts` and its 3.56 MB of physics engine.
//
// WHAT CAME OFF IT, 2026-10-22. "Live, from nothing" is gone from the front door. It is a demo of the generator
// placing elements with a robot driving between them, and as a thing to USE it is nothing: six controls, 147
// characters on the page, and no way to get anything out of it. The file stays — it is still what it is — but a
// front door should list what you can use, not what can be watched.
//
// Owner of: the 2D front door and what it lists.

/** One thing you can open. `needs` says what it wants of you, because that is the question a person actually has. */
export interface Door {
  name: string; says: string; href: string;
  needs: 'nothing' | 'a mouse' | 'a headset is better';
  /** which derived number makes it concrete, filled in when the engine that knows it has loaded */ fact?: FactKey;
}
export type FactKey = 'units' | 'works' | 'parts' | 'boards' | 'inbox';

export const DOORS: Door[] = [
  { name: 'Make something', says: 'Say it in a sentence; it is composed, checked, priced and its holds worked out.', href: './make.html', needs: 'nothing', fact: 'units' },
  { name: 'Boards', says: 'Pages, nodes and wires. The same nodes run as a pipeline you press ▶ on.', href: './boards.html', needs: 'nothing', fact: 'boards' },
  { name: 'To Claude', says: 'Press ⇧C to keep what you are looking at, or draw it, with what you want done.', href: './claude.html', needs: 'nothing', fact: 'inbox' },
  { name: 'The forge', says: 'The room you walk: the works, the warehouse, the benches, the phone in your hand.', href: './forge.html', needs: 'a headset is better', fact: 'works' },
  { name: 'One thing, lit', says: 'Any build on its own: turn it, take it apart, cut through it, read its curvature.', href: './look.html', needs: 'a mouse', fact: 'parts' },
  { name: 'The room Nexus builds', says: 'What the engine generated, standing where it put it. Read, not drawn by hand.', href: './room.html', needs: 'a mouse' },
];

export function homeHtml(): string {
  const open = DOORS.filter((d) => d.needs === 'nothing').length;
  return `
  <header>
    <h1>Nexus</h1>
    <p class="lede">Say what you want to build. It is composed from a library of real parts, checked against the laws
      it has to obey, and priced from sellers' own pages.</p>
    <p class="sub" id="sub">${open} of ${DOORS.length} open on a phone</p>
  </header>
  <nav class="doors">
    ${DOORS.map((d) => `<a class="go ${d.needs === 'nothing' ? 'flat' : 'deep'}" href="${d.href}">
      <b>${d.name}</b>
      <span class="says">${d.says}</span>
      <span class="feet">${d.fact ? `<span class="fact" data-fact="${d.fact}"></span>` : ''}<span class="needs">${d.needs === 'nothing' ? 'any browser' : d.needs}</span></span>
    </a>`).join('')}
  </nav>
  <footer>
    <p>Every number on this page is read from the engine when the page opens, not written into it. What a thing costs
      is a seller's page and the day it was seen; what it weighs is its parts; what it can hold is worked out from the
      load. Where a figure is an estimate it says so, and where there is none it says that instead of inventing one.</p>
    <p class="small">Your boards and anything you keep for Claude live in <b>this browser</b> — they do not follow you
      to another device. The local model answers only on the machine it is running on.</p>
  </footer>`;
}

const n = (x: number) => x.toLocaleString('en');

/** How many things are waiting to be handed over, from the pile itself, never a stored count. */
async function waitingSays(): Promise<string> {
  try {
    const { waiting } = await import('./inbox');
    const w = await waiting();
    return w ? `${w} waiting` : 'nothing waiting';
  } catch { return 'nothing waiting'; }
}

/** Every fact the page shows, each derived by the module that owns it, loaded only once the page is up. */
export async function facts(): Promise<Partial<Record<FactKey | 'sub', string>>> {
  const [{ INVENTORY }, { PRICES }, { everyUnit }, { under3K }, { DESIGNED }] = await Promise.all([
    import('../parts/inventory'), import('../parts/prices'), import('../ask/machine'),
    import('../works/budget'), import('../parts/components'),
  ]);
  const parts = INVENTORY.size, priced = Object.keys(PRICES).length, works = under3K();
  const drawn = DESIGNED.length;   // what the library actually designs, not the word "any"
  const open = DOORS.filter((d) => d.needs === 'nothing').length;
  return {
    units: `${everyUnit().length} units`,
    works: `${works.ids.length} stations · $${works.usd.toFixed(0)}`,
    parts: `${n(drawn)} designs drawn`,
    boards: 'kept in this browser',
    inbox: await waitingSays(),
    sub: `${n(parts)} parts · ${n(priced)} of them priced · ${open} of ${DOORS.length} open on a phone`,
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
