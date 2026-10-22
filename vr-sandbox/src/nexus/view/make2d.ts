// THE WORKBENCH, IN A PAGE. Say what you want; see it composed, priced and held — with no headset and no terminal.
//
// It runs the SAME functions the command line runs (`composeMachine`, `pack`, `holdsFor`), because every one of
// them is plain TypeScript with no `node:` import in it. So this is not a second engine with a prettier face: a
// number shown here is the number `npm run machine` prints, and if they ever disagreed that would be the finding.
//
// Owner of: the 2D make page. The engine it shows is owned where it always was.

import { composeMachine, machineText, type Machine } from '../ask/machine';
import { pack, type Pack } from '../teach/buildpack';
import { gravityMoment, holdsFor, type Joint, type Stay } from '../ask/hold';
import { usd } from '../parts/prices';

const esc = (s: unknown) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** What the page shows for one ask: the three answers, and nothing invented between them. */
export interface Made { asked: string; machine: Machine; bill: Pack; joint: Joint; stays: Stay[] }

/** THE HEAVIEST JOINT IN WHAT WAS COMPOSED, which is the one worth asking how to hold. Taken from the stage that
 *  carries the most, with the arm being that unit's own longest side — the machine's own figures, not a guess. */
export function heaviestJoint(m: Machine): Joint {
  let kg = 0, mm = 200;
  for (const st of m.stages) {
    const c = typeof st.carrying === 'number' && st.inUnit !== 'N·m' ? st.carrying : 0;
    if (c > kg) { kg = c; mm = Math.max(...st.unit.box) || 200; }
  }
  return { kg: +(kg || 1).toFixed(2), armMm: Math.round(mm), postMm: Math.round(mm * 0.6), attachMm: Math.round(mm * 0.3), faceMm: 20, swingDeg: 180 };
}

export function make(asked: string): Made {
  const machine = composeMachine(asked);
  const bill = pack(asked);
  const joint = heaviestJoint(machine);
  return { asked, machine, bill, joint, stays: holdsFor(joint) };
}

// ---- how it is shown -------------------------------------------------------------------------------------------

const lines = (p: Pack) => p.lines.filter((l) => l.section !== 'have');

function billHtml(p: Pack): string {
  const ls = lines(p), un = ls.filter((l) => l.usd == null).length;
  if (!ls.length) return `<p class="none">Nothing to buy for this one — see what it said below.</p>`;
  return `<table><thead><tr><th>what</th><th>from</th><th class="r">cost</th></tr></thead><tbody>
    ${ls.map((l) => `<tr class="${l.usd == null ? 'un' : ''}">
      <td><b>${esc(l.what)}</b>${l.n > 1 ? ` <span class="x">× ${l.n}</span>` : ''}<span class="why">${esc(l.why)}</span></td>
      <td class="from">${l.offer ? `<a href="${esc(l.offer.url)}" target="_blank" rel="noreferrer">${esc(l.offer.seller)}</a>` : l.usd == null ? '<i>no price kept</i>' : '<i>the design’s own figure</i>'}</td>
      <td class="r">${l.usd == null ? '—' : esc(usd(l.usd))}</td></tr>`).join('')}
  </tbody><tfoot><tr><td colspan="2">${ls.length} lines${un ? `, ${un} with no seller's price` : ''}</td>
    <td class="r"><b>${esc(usd(p.total.all[0]))}</b></td></tr></tfoot></table>`;
}

function staysHtml(j: Joint, stays: Stay[]): string {
  const want = gravityMoment(j);
  return `<p class="lede">Its heaviest joint carries <b>${j.kg} kg at ${j.armMm} mm</b>, which is
    <b>${want.toFixed(2)} N·m</b> to hold. Every way of holding it, and what holding costs:</p>
    <ul class="stays">${stays.map((s) => `<li class="${s.cannot ? 'no' : s.watts ? 'warm' : 'free'}">
      <span class="mark">${s.cannot ? '✗' : s.watts ? '~' : '✓'}</span>
      <div><b>${esc(s.name)}</b> <span class="w">${s.cannot ? '' : s.watts ? `${s.watts} W` : 'no power'}</span>
        <p>${esc(s.cannot ?? s.says)}</p>
        ${!s.cannot && s.costs ? `<p class="cost">costs: ${esc(s.costs)}</p>` : ''}</div></li>`).join('')}</ul>`;
}

export function madeHtml(m: Made): string {
  const txt = machineText(m.machine);
  const units = m.machine.stages.map((s) => s.unit.name);
  return `
  <section class="r1">
    <h2>What it is</h2>
    ${units.length ? `<p class="lede">${esc(m.machine.name)} — composed from ${units.length} unit${units.length === 1 ? '' : 's'}, not copied from one.</p>
      <ul class="units">${m.machine.stages.map((s) => `<li><b>${esc(s.unit.name)}</b><span>${esc(s.unit.says)}</span>
        <span class="carry">${s.ok ? '' : '⚠ '}carries ${typeof s.carrying === 'number' ? s.carrying.toFixed(2) : s.carrying} ${esc(s.inUnit ?? 'kg')}${s.ok ? ': holds' : `: ${esc(s.why ?? 'does not hold')}`}</span></li>`).join('')}</ul>`
      : `<p class="none">Nothing was composed for those words.</p>`}
    ${m.machine.refusals.length ? `<div class="wont"><b>It will not:</b><ul>${m.machine.refusals.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>` : ''}
    ${m.machine.notDone.length ? `<div class="wont"><b>Nothing consumed:</b> ${m.machine.notDone.map(esc).join('; ')}</div>` : ''}
  </section>
  <section class="r2"><h2>What to buy</h2>${billHtml(m.bill)}
    ${m.bill.notes.length ? `<div class="said"><b>Said:</b><ul>${m.bill.notes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
  </section>
  <section class="r3"><h2>What holds it</h2>${staysHtml(m.joint, m.stays)}</section>
  <details class="raw"><summary>The same thing as the command line prints it (<code>npm run machine</code>)</summary><pre>${esc(txt)}</pre></details>`;
}

/** Asks worth starting from: each one exercises a different part of the composer, and the last is the one that
 *  used to be answered with two steppers. */
export const TRY = [
  'a machine that cuts 400x300x80',
  'a machine that prints 300x300',
  'a machine that picks up 2kg and sees 800x400',
  'a machine that solders a board 200x150',
  'a desk lamp with an arm that stays where you put it',
];

export function mountMake(el: HTMLElement): void {
  el.innerHTML = `
    <header><a class="back" href="./index.html">← Nexus</a><h1>Make something</h1>
      <p class="lede">Say what it has to do. It is composed from the library, checked the way its arrangement
        fails, priced from sellers' pages, and its heaviest joint is asked how it can be held.</p></header>
    <form id="f"><input id="q" placeholder="a machine that cuts 400x300x80" autocomplete="off" spellcheck="false">
      <button type="submit">Make it</button></form>
    <div class="try">${TRY.map((t) => `<button class="chip" data-try="${esc(t)}">${esc(t)}</button>`).join('')}</div>
    <div id="out"></div>`;
  const q = el.querySelector<HTMLInputElement>('#q')!, out = el.querySelector<HTMLElement>('#out')!;
  const run = (words: string) => {
    q.value = words;
    out.innerHTML = '<p class="working">working it out…</p>';
    // one frame, so the "working" paint lands before the composer takes the thread
    requestAnimationFrame(() => {
      try { out.innerHTML = madeHtml(make(words)); }
      catch (e) { out.innerHTML = `<p class="none">It refused those words: ${esc((e as Error).message)}</p>`; }
      try { history.replaceState(null, '', `?ask=${encodeURIComponent(words)}`); } catch { /* a file:// page cannot */ }
    });
  };
  el.querySelector('#f')!.addEventListener('submit', (e) => { e.preventDefault(); if (q.value.trim()) run(q.value.trim()); });
  for (const b of el.querySelectorAll<HTMLElement>('[data-try]')) b.addEventListener('click', () => run(b.dataset.try!));
  const asked = new URLSearchParams(location.search).get('ask');
  run(asked || TRY[0]!);
}
