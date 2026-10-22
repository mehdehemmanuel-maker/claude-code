// THE WAY INTO THE ROOM, for whoever is holding a mouse.
//
// The forge is a room you talk to. In a headset that works: the chip grid floats over the dock and you point at what
// you want. On a screen it did not, because the whole interface was one text box with a placeholder in it — the room's
// own thirty-eight actions existed only as 3D chips, and the things you can ASK for existed nowhere at all. A person
// opening the page saw a room and a blank line, and the room looked like a screensaver.
//
// So this is the same two things, in the page: what you can SAY (asks the engine really makes, drawn from
// `ask/surprise.ts`'s own list, which is the generator's, not a list typed here), and what the ROOM does (the forge's
// own chips, handed in, so there is one list and the headset and the screen cannot drift apart).
//
// It goes in the chat column, directly above the box you type in, because that is where a person is already looking
// when they are wondering what to say.
//
// Owner of: the forge page's on-screen ways in.

import { DESIGNS } from '../ask/surprise';
import { mountBoards } from './boards2d';
import { traced } from './flow2d';
import type { FlowApi } from '../substrate/flows';

// ---- the page's own furniture: the strips the room's buttons are put in, and the button itself ---------------------

/** Top right: what the playback and the voice are doing. */
export const ui = document.createElement('div');
ui.style.cssText = 'position:fixed;right:16px;top:calc(12px + env(safe-area-inset-top,0px));display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;z-index:5;max-width:calc(100vw - 32px)';
document.body.appendChild(ui);
export const BTN = 'font:600 13px system-ui;padding:8px 12px;border-radius:8px;border:1px solid #2e7d8c;background:#06141c;color:#bdefff;cursor:pointer';
/** A button on the page, in the room's own look. Its default home is the strip above. */
export const button = (text: string, on: (b: HTMLButtonElement) => void, parent: HTMLElement = ui): HTMLButtonElement => {
  const b = document.createElement('button'); b.textContent = text; b.style.cssText = BTN; b.onclick = () => on(b); parent.appendChild(b); return b;
};
/** Under it: the tools, in named rows. The forge decides when to show it. */
export const tools = document.createElement('div');
tools.style.cssText = 'position:fixed;right:16px;top:calc(60px + env(safe-area-inset-top,0px));display:flex;flex-direction:column;align-items:flex-end;gap:6px;z-index:5;max-width:min(36rem,calc(100vw - 32px))';
export const rowOf = (title: string): HTMLDivElement => {
  const r = document.createElement('div'); r.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px;align-items:center';
  const t = document.createElement('span'); t.textContent = title;
  t.style.cssText = 'font:600 11px system-ui;color:#7fb3c8;letter-spacing:.08em;text-transform:uppercase';
  r.appendChild(t); tools.appendChild(r); return r;
};

/** EVERY PAGE REACHES THE OTHERS. The forge had no way out of it: a person who opened it from the front door could
 *  only use the browser's own back button, and nothing on it said that the boards, the look page and the room are one
 *  thing seen three ways. One strip of links, in the same place, saying so. */
export function forgeDoors(): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;font:12px/1.2 system-ui';
  for (const [href, label] of [['./index.html', '\u2190 Nexus'], ['./boards.html', 'Boards'], ['./look.html', 'Look'], ['./claude.html', 'To Claude']] as const) {
    const a = document.createElement('a'); a.href = href; a.textContent = label;
    a.style.cssText = `color:${label.startsWith('\u2190') ? '#7fb3c8' : '#4dd0e1'};text-decoration:none;padding:3px 0`;
    el.appendChild(a);
  }
  return el;
}

/** The room's verbs that are worth offering before anything has been built, and what each is for. Every one of them
 *  is a thing the forge answers; none is a new door written here. */
const ASKS: [string, string][] = [
  ['show me the works', 'the sixteen-station workshop, stood out in the room'],
  ['surprise me', 'something it chooses, made from nothing'],
  ['take it apart', 'the last thing made, exploded into its parts'],
  ['show the flaws', 'what the critic found, each on the part it is in'],
  ['parts list', 'everything the build is made of'],
  ['what am I looking at?', 'Claude says what is in front of you'],
];

const BOX = 'display:flex;flex-wrap:wrap;gap:4px';
const CHIP = 'font:12px/1.2 system-ui;padding:6px 9px;border-radius:7px;border:1px solid #2e7d8c;'
  + 'background:#07131c;color:#d9f3ff;cursor:pointer;min-height:30px';
const SAYS = 'font:11px/1.2 ui-monospace,Menlo,monospace;letter-spacing:.05em;text-transform:uppercase;color:#5f93a6';

/** Six asks from the generator's own list, with a seed so pressing ⟲ gives six others. */
function someDesigns(seed: number): string[] {
  let s = seed >>> 0 || 1;
  const r = (): number => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const out: string[] = [], seen = new Set<number>();
  while (out.length < 6 && seen.size < DESIGNS.length) {
    const i = Math.floor(r() * DESIGNS.length);
    if (seen.has(i)) continue;
    seen.add(i); out.push(`build ${DESIGNS[i]!(r)}`);
  }
  return out;
}

export interface Ways { el: HTMLElement }

/** Put the ways in above the box. `say` is the forge's own `send`, so a press is exactly as if it had been typed. */
export function mountForgeWays(before: HTMLElement, chips: [string, () => void][], say: (t: string) => void): Ways {
  const el = document.createElement('div');
  el.style.cssText = 'display:flex;flex-direction:column;gap:6px;padding:8px 10px;border-radius:10px;'
    + 'background:rgba(3,14,22,0.78);border:1px solid #1f5866;color:#d9f3ff;max-height:46vh;overflow:auto';

  const head = document.createElement('div');
  head.style.cssText = `${SAYS};display:flex;justify-content:space-between;align-items:center;gap:8px`;
  const title = document.createElement('span'); title.textContent = 'things you can say';
  const again = document.createElement('button'); again.type = 'button'; again.textContent = '⟲ others';
  again.style.cssText = `${CHIP};padding:3px 7px;min-height:0;font-size:11px`;
  head.append(title, again);

  const asks = document.createElement('div'); asks.style.cssText = BOX;
  const makes = document.createElement('div'); makes.style.cssText = BOX;

  const press = (t: string) => { say(t); };
  for (const [words, why] of ASKS) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = words; b.title = why;
    b.style.cssText = CHIP; b.onclick = () => press(words);
    asks.appendChild(b);
  }
  let seed = (Date.now() / 1000) | 0;
  const drawMakes = () => {
    makes.replaceChildren();
    for (const words of someDesigns(seed)) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = words;
      b.title = 'the engine designs it from its laws, then checks it';
      b.style.cssText = `${CHIP};border-color:#8a6d2f;color:#ffe9a8`;
      b.onclick = () => press(words);
      makes.appendChild(b);
    }
  };
  again.onclick = () => { seed = (seed + 7919) >>> 0; drawMakes(); };
  drawMakes();

  // the room's own actions, folded away: they are many, and they are for after something is standing
  const more = document.createElement('details');
  const sum = document.createElement('summary');
  sum.textContent = `everything this room does · ${chips.length}`;
  sum.style.cssText = `${SAYS};cursor:pointer`;
  const grid = document.createElement('div'); grid.style.cssText = `${BOX};margin-top:6px`;
  for (const [label, act] of chips) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
    b.style.cssText = `${CHIP};border-color:#24424f`;
    b.onclick = () => { act(); };
    grid.appendChild(b);
  }
  more.append(sum, grid);

  el.append(head, makes, asks, more);
  before.parentElement?.insertBefore(el, before);
  return { el };
}


// ---- the board, in the room ----------------------------------------------------------------------------------------

/** THE SAME BOARD, ON THE ROOM'S OWN HANDS.
 *
 *  I built the 2D board as a separate page, found that nine of its worked pipelines drive things that only exist in
 *  the room, and marked them as withheld. That was the wrong fix and the user said so: a capability you cannot
 *  transfer is not a reason to keep two of something, it is a reason to put the one thing where the capability
 *  already is. So the board is mounted HERE too — the same `boards2d.ts`, reading the same IndexedDB store the 3D
 *  wall reads, running on `view/forge.ts`'s own `flowApi` through `traced`, which gives the room's hands the same
 *  end-to-end picture the engine's had. Nothing is withheld in here, because there is nothing to withhold from.
 *
 *  Three projections of one thing now, not two things: this panel, the wall in the headset, and the page for when
 *  there is no room to open. */
export function mountBoardPanel(api: FlowApi): void {
  const panel = document.createElement('div');
  panel.className = 'boards forgeboards';
  panel.hidden = true;
  const inner = document.createElement('div');
  inner.className = 'shell';
  const shut = document.createElement('button');
  shut.type = 'button'; shut.textContent = '\u2715'; shut.title = 'close the board';
  shut.style.cssText = `${CHIP};position:absolute;right:10px;top:10px;z-index:4`;
  panel.append(inner, shut);
  document.body.appendChild(panel);

  let up = false;
  const open = (): void => {
    panel.hidden = false;
    // mounted the first time it is opened, so the room is not slowed by a board nobody asked for
    if (!up) { up = true; mountBoards(inner, { make: () => traced(api), room: true }); }
  };
  shut.onclick = () => { panel.hidden = true; };
  // THE ROOM'S SHORTCUTS STAND DOWN WHILE THE BOARD IS UP. The forge listens on the window for space (pause), r (run
  // again) and → (step); the board has buttons and selects you reach with a keyboard, and pressing one with the space
  // bar would also have paused the room behind it. Stopped at the panel, so the board's own handlers (which sit
  // inside it) still run and the room's, which sit on the window, do not.
  panel.addEventListener('keydown', (e) => { e.stopPropagation(); });
  button('\u25a6 Board', () => { if (panel.hidden) open(); else panel.hidden = true; });
}
