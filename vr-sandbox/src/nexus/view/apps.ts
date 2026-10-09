// Apps the forge adds to the phone: the Warehouse (your builds, kept on shelves; store the one on the table, bring one
// back to build it again, walk there and back) and the Robots (each by name: what it is doing, its battery, what it
// can do, its rules as a pipeline you can open, and what you can tell it: sleep, wake, charge, come, patrol, dance …).

import type { Kit, Nav, PhoneApp, View } from './phone';
import { ABILITIES, factName, type AbilityId, type Bot, type Fleet } from '../fleet';
import { METALS, RECIPES, bill, type Cell, type MadePart } from '../cell';
import { INVENTORY, categories, fundamentals, resolve, routeOf, summary, type Item } from '../inventory';
import { behave } from '../behave';
import { flatBom, massOf, typeOf } from '../outputs';
import { catalogue, SERIES } from '../catalogue';
import { numberOf, partAt, randomPart, spaceSize } from '../partspace';
import { callFamily } from '../families';
import { FAMILIES, type Family } from '../families';
import { DESIGNED, component } from '../components';
import { grams, massOf as partMass } from '../mass';
import { TARGETS, pinSays, type Ran, type Target } from '../codesim';
import type { Line, Pack } from '../buildpack';
import { usd } from '../prices';
import { BRAIN_MAP, MESSENGER_IDS, type Kind, type LifeGraph, type Node as LifeNode } from '../life/graph';
import { clock, dayOf, RHYTHMS } from '../life/rhythm';
import { compass, forMaking, placeName, rainAhead, sky, skyIcon, type Forecast, type Place } from '../weather';

/** A build kept in the warehouse: what it is called, what made it, how to make it again, and where it is shelved. */
export interface StoredBuild { id: string; title: string; ask?: string; kind: 'steps' | 'machine' | 'shapes'; steps?: string[]; footprint?: [number, number]; verdict?: string; kg?: number; slot?: string; at: number; parts: MiniPart[] }
/** A part of a stored build's model: its shape, where it is, how it is turned and stretched, and its look. */
export interface MiniPart { k: string; at: [number, number, number]; d: Record<string, number>; t: [number, number, number]; s: [number, number, number]; axis?: string; c: number; m: number; r: number }

export interface WarehouseHost { kept(): StoredBuild[]; store(): string; fetch(id: string): string; remove(id: string): string; go(place: 'warehouse' | 'table'): string; where(): 'warehouse' | 'table' | 'workshop'; fleet: Fleet }
const AMBER = '#ffd600';

export function warehouseApp(h: WarehouseHost): PhoneApp {
  let said = '';
  const per = 5;
  return {
    id: 'warehouse', name: 'Warehouse', icon: '📦', colour: AMBER,
    pages: () => Math.max(1, Math.ceil(h.kept().length / per)),
    draw(k: Kit, v: View) {
      const { text, wrapped, button, g, W, bottom } = k, kept = h.kept(), f = h.fleet;
      text('Warehouse', 40, 122, 44, AMBER, 800);
      text(`${kept.length} build${kept.length === 1 ? '' : 's'} kept · ${f.bots.filter((b) => !b.asleep).length} of ${f.bots.length} robots awake`, 40, 152, 18, '#ffe082', 500, W - 80);
      const bw = (W - 70) / 2;
      button(30, 170, bw, 70, h.where() === 'warehouse' ? '↩ Back to the table' : '🚶 Go there', 'go', undefined, AMBER, 'rgba(255,214,0,0.14)');
      button(40 + bw, 170, bw, 70, '📦 Store build', 'store', undefined, AMBER, 'rgba(255,214,0,0.14)');
      if (said) wrapped(said, 40, 270, 17, W - 80, '#ffe082', 3);
      if (!kept.length) wrapped('Nothing kept yet. Build something on the table, then 📦 Store it: a robot drives out, lifts it off the table and shelves it here as a model, ready to build again.', 40, 340, 21, W - 80, '#cfd8dc', 6);
      kept.slice().reverse().slice(v.page * per, v.page * per + per).forEach((b, j) => {
        const y = 340 + j * 130, i = kept.length - 1 - (v.page * per + j);
        g.fillStyle = 'rgba(255,214,0,0.08)'; g.beginPath(); g.roundRect(30, y, W - 60, 118, 16); g.fill();
        text(b.title, 46, y + 32, 22, '#ffffff', 700, W - 260);
        text(`${b.slot ? `shelf ${b.slot}` : 'on its way in'} · ${b.verdict ? `${b.verdict.toLowerCase()} · ` : ''}${b.parts.length} parts`, 46, y + 60, 16, '#ffe082', 500, W - 260);
        text(b.kind === 'shapes' ? 'a model only: no steps kept to build it again' : new Date(b.at).toLocaleString(), 46, y + 86, 15, '#b0bec5', 400, W - 260);
        button(W - 214, y + 22, 112, 74, '▶ Build', 'fetch', i, AMBER, 'rgba(255,214,0,0.2)');
        button(W - 96, y + 22, 56, 74, '✕', 'remove', i, '#ff8a80', 'rgba(255,82,82,0.12)');
      });
      text('Robots carry builds in and out · the Robots app runs them', 40, bottom - 14, 16, '#b0bec5', 400, W - 80);
    },
    act(act, arg, nav: Nav) {
      const kept = h.kept();
      switch (act) {
        case 'go': said = h.go(h.where() === 'warehouse' ? 'table' : 'warehouse'); return true;
        case 'store': said = h.store(); return true;
        case 'fetch': { const b = kept[Number(arg)]; if (b) said = h.fetch(b.id); nav.redraw(); return true; }
        case 'remove': { const b = kept[Number(arg)]; if (b) said = h.remove(b.id); return true; }
      }
      return false;
    },
  };
}

export interface RobotsHost { fleet: Fleet; rename(b: Bot, name: string): string; toggle(b: Bot, a: AbilityId): string; command(b: Bot, what: string): string; rules(b: Bot): string; go(place: 'warehouse' | 'table'): string }
export function robotsApp(h: RobotsHost): PhoneApp {
  let said = '';
  const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;
  const bar = (k: Kit, x: number, y: number, w: number, p: number) => { k.g.fillStyle = 'rgba(255,255,255,0.12)'; k.g.fillRect(x, y, w, 10); k.g.fillStyle = p < 25 ? '#ff5252' : p < 50 ? '#ffd740' : '#69f0ae'; k.g.fillRect(x, y, (w * p) / 100, 10); };
  return {
    id: 'robots', name: 'Robots', icon: '🤖', colour: '#ff9100',
    draw(k: Kit, v: View) {
      const { text, wrapped, button, g, W } = k, f = h.fleet, b = v.sub ? f.bot(v.sub) : null;
      if (!b) {
        text('Robots', 40, 122, 44, '#ff9100', 800); text('press one to name it, change what it can do, or tell it what to do', 40, 152, 17, '#ffcc80', 500, W - 80);
        f.bots.forEach((x, i) => {
          const y = 176 + i * 150; g.fillStyle = `${hex(x.colour)}22`; g.beginPath(); g.roundRect(30, y, W - 60, 136, 18); g.fill(); g.strokeStyle = hex(x.colour); g.lineWidth = 2; g.stroke();
          text(`${x.name}${x.asleep ? ' 💤' : ''}`, 50, y + 40, 30, hex(x.colour), 800, W - 200);
          text(x.doing, 50, y + 72, 18, '#ffffff', 500, W - 110); text(`${Math.round(x.battery)}% · ${x.abilities.length} abilities · ${x.state}`, 50, y + 100, 16, '#cfd8dc', 500, W - 110);
          bar(k, 50, y + 114, W - 120, x.battery); k.hit(30, y, W - 30, y + 136, 'bot', x.id);
        });
        const y = 176 + f.bots.length * 150 + 10, bw = (W - 80) / 3;
        button(30, y, bw, 64, 'All sleep', 'all', 'sleep', '#b388ff'); button(40 + bw, y, bw, 64, 'All wake', 'all', 'wake', '#ffd740'); button(50 + 2 * bw, y, bw, 64, 'All charge', 'all', 'charge', '#69f0ae');
        button(30, y + 76, W - 60, 64, '🚶 Go to the warehouse to watch them', 'go');
        if (said) wrapped(said, 40, y + 170, 17, W - 80, '#ffcc80', 3);
        return;
      }
      // one robot: its name, battery, doing, abilities to switch, what to tell it, its rules, what it did
      const c = hex(b.colour);
      text(`${b.name}${b.asleep ? ' 💤' : ''}`, 40, 120, 44, c, 800, W - 200); button(W - 170, 82, 140, 56, '✎ Rename', 'rename', undefined, c);
      text(`${Math.round(b.battery)}% · ${b.doing}`, 40, 156, 18, '#ffffff', 500, W - 80); bar(k, 40, 166, W - 80, b.battery);
      text('What it can do (press to switch)', 40, 210, 18, c, 700);
      (Object.keys(ABILITIES) as AbilityId[]).forEach((a, i) => { const on = b.abilities.includes(a), x = 30 + (i % 4) * ((W - 60) / 4), y = 222 + Math.floor(i / 4) * 58; button(x + 3, y, (W - 60) / 4 - 6, 50, `${on ? '✓' : '·'} ${a}`, 'ability', a, on ? c : '#546e7a', on ? `${c}33` : 'rgba(255,255,255,0.04)'); });
      text('Tell it', 40, 364, 18, c, 700);
      const cmds = [b.asleep ? ['Wake', 'wake'] : ['Sleep', 'sleep'], ['Charge', 'charge'], ['Stop', 'stop'], ['Come', 'come'], ['Patrol', 'patrol'], ['Restock', 'restock'], ['Dance', 'dance'], ['Random', 'something']];
      cmds.forEach(([l, w], i) => button(30 + (i % 4) * ((W - 60) / 4) + 3, 376 + Math.floor(i / 4) * 62, (W - 60) / 4 - 6, 54, l!, 'cmd', w, c));
      button(30, 506, W - 60, 64, '⚡ Open its rules (a pipeline)', 'rules', undefined, '#ff1744', 'rgba(255,23,68,0.14)');
      wrapped(`Its rules read numbers like ${factName(b.name)}_battery and ${factName(b.name)}_idle; each IF on the board starts its THEN. Change a step's words there to change what it does.`, 40, 600, 15, W - 80, '#cfd8dc', 3);
      if (said) wrapped(said, 40, 668, 17, W - 80, '#ffcc80', 3);
      text('What it did', 40, 748, 18, c, 700);
      b.log.slice(-7).reverse().forEach((l, i) => text(`· ${l.text}`, 40, 780 + i * 30, 16, '#e0e0e0', 400, W - 80));
    },
    act(act, arg, nav: Nav) {
      const f = h.fleet, b = nav.sub ? f.bot(nav.sub) : null;
      switch (act) {
        case 'bot': said = ''; nav.go(String(arg)); return true;
        case 'all': said = f.bots.map((x) => h.command(x, String(arg))).join(' '); return true;
        case 'go': said = h.go('warehouse'); return true;
        case 'cmd': if (b) said = h.command(b, String(arg)); return true;
        case 'ability': if (b) said = h.toggle(b, arg as AbilityId); return true;
        case 'rules': if (b) said = h.rules(b); return true;
        case 'rename': if (b) nav.write(`a new name for ${b.name}`, (t) => { said = h.rename(b, t); nav.redraw(); }); return true;
      }
      return false;
    },
  };
}

export interface WorkshopHost { cell: Cell; go(): string; print(p: MadePart): string; cast(p: MadePart, metal: string): string; build(id: string): string; gcode(text: string): string; stop(): string }
/** The workshop on the phone: what each machine is doing, how fast time runs there, and what to make: a part printed,
 *  a part cast, a device built from a recipe, or G-code of your own. */
export function workshopApp(h: WorkshopHost): PhoneApp {
  let said = '', metal = 'aluminium';
  const C = '#ff7043', parts = (): MadePart[] => RECIPES.flatMap((r) => r.printed).filter((p, i, a) => a.findIndex((q) => q.name === p.name) === i);
  return {
    id: 'workshop', name: 'Workshop', icon: '🔩', colour: C,
    draw(k: Kit, v: View) {
      const { text, wrapped, button, W, g } = k, c = h.cell, pr = c.printer, m = c.furnace.metal();
      if (v.sub === 'print' || v.sub === 'cast') {
        text(v.sub === 'print' ? 'Print a part' : 'Cast a part', 40, 122, 40, C, 800);
        if (v.sub === 'cast') { text('in', 40, 160, 20, '#ffccbc'); METALS.forEach((x, i) => button(80 + i * 112, 134, 106, 44, x.id, 'metal', x.id, metal === x.id ? '#ffffff' : C, metal === x.id ? 'rgba(255,112,67,0.6)' : 'rgba(255,112,67,0.12)')); }
        parts().forEach((p, i) => { const y = 196 + i * 86; button(30, y, W - 60, 74, `${p.name}${p.cast ? ` (made to be cast in ${p.cast})` : ''}`, v.sub === 'print' ? 'doprint' : 'docast', p.name, C); });
        if (said) wrapped(said, 40, 196 + parts().length * 86 + 20, 17, W - 80, '#ffccbc', 4);
        return;
      }
      if (v.sub === 'build') {
        text('Build a device', 40, 122, 40, C, 800); text('printed and cast parts, and parts off the rack, put together', 40, 152, 16, '#ffccbc', 500, W - 80);
        RECIPES.forEach((r, i) => { const y = 176 + i * 132, b = bill(r); g.fillStyle = 'rgba(255,112,67,0.10)'; g.beginPath(); g.roundRect(30, y, W - 60, 120, 16); g.fill(); text(r.name, 46, y + 32, 22, '#ffffff', 700, W - 220); wrapped(r.does, 46, y + 56, 15, W - 220, '#ffccbc', 2); text(`${(b.g / 1000).toFixed(2)} kg · ${(b.mA / 1000).toFixed(2)} A`, 46, y + 106, 15, '#b0bec5'); button(W - 160, y + 30, 114, 64, '▶ Build', 'dobuild', r.id, C, 'rgba(255,112,67,0.3)'); });
        if (said) wrapped(said, 40, 176 + RECIPES.length * 132 + 10, 16, W - 80, '#ffccbc', 3);
        return;
      }
      if (v.sub === 'gcode') {
        text('Program the printer', 40, 122, 36, C, 800); wrapped('Write G-code line by line on the keyboard of light; the printer runs it as Marlin would (G28 first; it will not extrude below 170 °C).', 40, 152, 16, W - 80, '#ffccbc', 3);
        const presets: [string, string][] = [['Home and heat for PLA', 'G28\nM140 S60\nM104 S210'], ['Draw a 40 mm square', 'G28\nM190 S60\nM109 S210\nG90\nM82\nG92 E0\nG1 Z0.2 F600\nG1 X90 Y90 F6000\nG1 X130 Y90 E1.33 F1500\nG1 X130 Y130 E2.66\nG1 X90 Y130 E3.99\nG1 X90 Y90 E5.32\nG1 Z10 F600\nM104 S0\nM140 S0'], ['Cool down', 'M104 S0\nM140 S0\nM107\nM84']];
        presets.forEach(([l, code], i) => button(30, 230 + i * 84, W - 60, 72, l, 'preset', code, C));
        button(30, 230 + presets.length * 84, W - 60, 72, '⌨ Write G-code', 'write', undefined, '#ffffff', 'rgba(255,112,67,0.3)');
        text('The printer now', 40, 560, 18, C, 700);
        pr.log.slice(-8).forEach((l, i) => text(`· ${l}`, 40, 592 + i * 26, 15, '#e0e0e0', 400, W - 80));
        if (said) wrapped(said, 40, 820, 16, W - 80, '#ffccbc', 3);
        return;
      }
      text('Workshop', 40, 122, 44, C, 800); text(`time here runs ×${c.speed}: a print takes hours, a burnout a day`, 40, 152, 16, '#ffccbc', 500, W - 80);
      const rows = [
        `🖨 ${pr.busy ? `printing ${Math.round((100 * pr.done) / Math.max(1, pr.total))}%` : 'printer idle'} · ${pr.hot.t.toFixed(0)}/${pr.hot.target} °C · bed ${pr.bed.t.toFixed(0)}/${pr.bed.target} °C`,
        `🔥 kiln ${c.kiln.says()}`, `⚗ furnace ${Math.round(c.furnace.t)} °C${m ? ` · metal ${Math.round(m.T)} °C, ${Math.round(m.liquid * 100)}% molten` : ''}`,
        `🦾 ${c.arms.rail.name}: ${c.arms.rail.doing}`, `🦾 ${c.arms.bench.name}: ${c.arms.bench.doing}`,
      ];
      rows.forEach((r, i) => text(r, 40, 190 + i * 32, 17, '#ffffff', 500, W - 80));
      const bw = (W - 80) / 3; [1, 60, 600].forEach((x, i) => button(30 + i * (bw + 10), 352, bw, 56, `×${x}`, 'speed', x, c.speed === x ? '#ffffff' : C, c.speed === x ? 'rgba(255,112,67,0.6)' : 'rgba(255,112,67,0.12)'));
      const b2 = (W - 70) / 2;
      button(30, 422, b2, 70, '🖨 Print a part', 'go', 'print', C); button(40 + b2, 422, b2, 70, '⚗ Cast a part', 'go', 'cast', C);
      button(30, 502, b2, 70, '🔧 Build a device', 'go', 'build', C); button(40 + b2, 502, b2, 70, '⌨ Program it', 'go', 'gcode', C);
      button(30, 582, b2, 70, '🚶 Go there', 'walk', undefined, '#ffd600'); button(40 + b2, 582, b2, 70, '🛑 Stop all', 'stop', undefined, '#ff5252');
      text('Jobs', 40, 690, 18, C, 700);
      c.jobs.slice(-5).reverse().forEach((j, i) => wrapped(`${j.done ? (j.failed ? '✗' : '✓') : '▶'} ${j.name}: ${j.stage}`, 40, 720 + i * 52, 15, W - 80, j.done ? '#b0bec5' : '#ffffff', 2));
      if (said) wrapped(said, 40, 990, 15, W - 80, '#ffccbc', 2);
    },
    act(act, arg, nav: Nav) {
      const p = parts().find((x) => x.name === arg);
      switch (act) {
        case 'go': said = ''; nav.go(String(arg)); return true;
        case 'speed': h.cell.speed = Number(arg); return true;
        case 'walk': said = h.go(); return true;
        case 'stop': said = h.stop(); return true;
        case 'metal': metal = String(arg); return true;
        case 'doprint': if (p) said = h.print(p); return true;
        case 'docast': if (p) said = h.cast(p, metal); return true;
        case 'dobuild': said = h.build(String(arg)); return true;
        case 'preset': said = h.gcode(String(arg)); return true;
        case 'write': nav.write('G-code: lines separated by ; or new lines, e.g. G28; M104 S210', (t) => { said = h.gcode(t.replace(/\s*;\s*(?=[GMT]\d)/gi, '\n')); nav.redraw(); }); return true;
      }
      return false;
    },
  };
}

export interface InventoryHost { make(words: string): void; board(id: string): string; tree(id: string): string; open(): string; feed(text: string): string; said(): string; /** lift it out in 3D before you, apart */ see(id: string): string }
/** The inventory on the phone: its categories, down to each entry; what is inside it (press a part to go into it);
 *  making it; its pipeline and its tree on the board; the adjustable families and their sizes; and feeding it. */
export function inventoryApp(h: InventoryHost): PhoneApp {
  const C = '#26c6da', per = 9; let said = '';
  const list = (sub: string): { label: string; note: string; act: string; arg: string }[] => {
    if (sub === '') return [...categories().keys()].map((c) => ({ label: c, note: `${[...categories().get(c)!.values()].reduce((a, m) => a + [...m.values()].reduce((x, ids) => x + ids.length, 0), 0)} entries`, act: 'go', arg: `cat:${c}` }));
    if (sub.startsWith('cat:')) { const cat = sub.slice(4), subs = categories().get(cat); if (!subs) return []; return [...subs].flatMap(([sc, m]) => [...m].flatMap(([ss, ids]) => ids.filter((id) => !(INVENTORY.get(id)!.adjustable && !INVENTORY.get(id)!.family)).map((id) => { const i = INVENTORY.get(id)!; return { label: `${i.family ? '⚙ ' : ''}${i.name}`, note: [sc, ss].filter(Boolean).join(' › '), act: 'go', arg: `item:${id}` }; }))); }
    // the families by trade: a category, its subcategories, the families in each
    if (sub === 'fam' || sub.startsWith('famc:')) {
      const at = sub === 'fam' ? [] : sub.slice(5).split('/'), under = FAMILIES.filter((f) => at.every((c, i) => f.path[i] === c));
      if (at.length >= 2) return under.map((f) => ({ label: `⚙ ${f.name}`, note: f.path.slice(2).join(' › ') || f.says.slice(0, 60), act: 'go', arg: `famx:${f.id}` }));
      const groups = new Map<string, number>(); for (const f of under) groups.set(f.path[at.length] ?? '', (groups.get(f.path[at.length] ?? '') ?? 0) + 1);
      return [...groups].sort((a, b) => b[1] - a[1]).map(([c, k]) => ({ label: c, note: `${k} kind${k > 1 ? 's' : ''} of part`, act: 'go', arg: `famc:${[...at, c].join('/')}` }));
    }
    if (sub.startsWith('famx:')) { const id = sub.slice(5), f = FAMILIES.find((x) => x.id === id); const lines = catalogue(id); return f ? (lines.length ? lines : f.examples).map((ex) => ({ label: ex, note: lines.length ? 'a standard size: press to see it' : 'press to see it, made to these sizes', act: 'fam', arg: ex })) : []; }
    if (sub.startsWith('fund:')) return fundamentals(sub.slice(5)).map((e) => ({ label: `⚛ ${e.name}`, note: e.via.length ? `in ${e.via.slice(0, 3).map((v) => `${v.material} (${v.pct >= 1 ? v.pct.toFixed(1) : v.pct.toFixed(2)} %)`).join(', ')}${e.via.length > 3 ? ` and ${e.via.length - 3} more` : ''}` : 'itself', act: 'go', arg: `item:${e.id}` }));
    if (sub.startsWith('item:')) { const i = INVENTORY.get(sub.slice(5)); if (i?.kind === 'material' && i.makeup) return i.makeup.map((m) => { const x = INVENTORY.get(m.id); return { label: `${x?.kind === 'element' ? '⚛ ' : ''}${x?.name ?? m.id}`, note: `${m.pct >= 1 ? m.pct.toFixed(1) : m.pct.toFixed(3)} % of it by mass`, act: 'go', arg: `item:${m.id}` }; }); if (i?.kind === 'element') return [...INVENTORY.values()].filter((x) => x.makeup?.some((m) => m.id === i.id)).map((x) => ({ label: x.name, note: `${x.makeup!.find((m) => m.id === i.id)!.pct.toFixed(2)} % ${i.name.replace(/ \(.*\)$/, '')}`, act: 'go', arg: `item:${x.id}` })); return i ? i.of.map((c) => { const ci = INVENTORY.get(c.id)!, r = routeOf(ci); return { label: `${c.n > 1 ? `${c.n} × ` : ''}${ci.name}`, note: ci.kind === 'material' ? 'from stock' : r.bought ? 'bought' : `made here: ${r.process}`, act: 'go', arg: `item:${c.id}` }; }) : []; }
    return [];
  };
  return {
    id: 'inventory', name: 'Inventory', icon: '🗃', colour: C,
    pages: (sub) => Math.max(1, Math.ceil(list(sub).length / per)),
    draw(k: Kit, v: View) {
      const { text, wrapped, button, g, W, bottom, hit } = k, sub = v.sub;
      let y = 160;
      if (sub.startsWith('item:')) {
        const i = INVENTORY.get(sub.slice(5)); if (!i) { text('Not found', 40, 122, 36, C, 800); return; }
        const r = routeOf(i), sm = i.kind === 'material' ? null : summary(i.id);
        text(i.name, 40, 118, i.name.length > 44 ? 20 : i.name.length > 26 ? 24 : 32, C, 800, W - 80); text(i.path.join(' › '), 40, 146, 15, '#b2ebf2', 500, W - 80);
        y = 172 + wrapped(i.says, 40, 172, 17, W - 80, '#ffffff', 3);
        if (i.spec) y += wrapped(i.spec, 40, y + 4, 15, W - 80, '#b2ebf2', 3) + 4;
        if (i.sized) { const no = numberOf(i.sized.family, i.sized.params); if (no >= 0) { text(`part no. ${no.toLocaleString('en-GB')} of ${spaceSize().total.toLocaleString('en-GB')}`, 40, y + 18, 13, '#7fa9b5', 600, W - 80); y += 20; } }
        text(i.kind === 'material' ? 'a material: from stock' : r.bought ? `bought: ${r.why.replace(/^bought: /, '')}` : `made here: ${r.why}`, 40, y + 22, 15, r.bought ? '#ffb74d' : '#69f0ae', 600, W - 80); y += 30;
        if (sm) { text(`inside: ${sm.made} made here · ${sm.bought} bought · ${sm.stock} from stock · ${sm.depth} levels`, 40, y + 18, 15, '#e0f7fa', 500, W - 80); y += 26; }
        if (i.kind !== 'material' && i.kind !== 'element') { const bw = (W - 80) / 3; button(30, y + 10, bw, 58, '▶ Make it', 'make', i.id, C, 'rgba(38,198,218,0.3)'); button(40 + bw, y + 10, bw, 58, '⚡ Pipeline', 'board', i.id, C); button(50 + 2 * bw, y + 10, bw, 58, '🌳 Tree', 'tree', i.id, C); y += 70;
          button(30, y + 4, bw, 52, '⚙ Does', 'behave', i.id, C); button(40 + bw, y + 4, bw, 52, '📋 Parts', 'bom', i.id, C); button(50 + 2 * bw, y + 4, bw, 52, '⚛ Elements', 'go', `fund:${i.id}`, C); y += 64; }
        button(30, y + 2, W - 60, 50, '🧊 See it in 3D, apart', 'see', i.id, C, 'rgba(38,198,218,0.22)'); y += 58;
        text(i.kind === 'material' ? 'What it is made of (press to go in)' : i.kind === 'element' ? 'The materials it is in' : i.of.length ? 'What is in it (press to go in)' : '', 40, y + 18, 16, C, 700); y += 26;
      } else {
        text(sub === '' ? 'Inventory' : sub === 'fam' ? 'Kinds of part' : sub.startsWith('famc:') ? sub.slice(5).split('/').join(' › ') : sub.startsWith('famx:') ? `⚙ ${FAMILIES.find((f) => f.id === sub.slice(5))?.name ?? ''}` : sub.startsWith('fund:') ? `⚛ ${INVENTORY.get(sub.slice(5))?.name ?? ''}` : sub.slice(4), 40, 118, sub.startsWith('fund:') ? 28 : 38, C, 800, W - 80);
        if (sub.startsWith('fund:')) { text(`comes down to ${fundamentals(sub.slice(5)).length} elements, the same ones everything does`, 40, 146, 15, '#b2ebf2', 500, W - 80); y = 160; }
        if (sub === '') { wrapped(`${INVENTORY.size} entries · ${FAMILIES.length} families · ${catalogue().length.toLocaleString('en-GB')} catalogue sizes · ${spaceSize().parts.toLocaleString('en-GB')} distinct parts · ${spaceSize().total.toExponential(2)} sizes can be made`, 40, 140, 15, W - 80, '#b2ebf2', 2); const bw = (W - 80) / 3; button(30, 176, bw, 56, '⚙ Kinds', 'go', 'fam', C); button(40 + bw, 176, bw, 56, '⌨ Find', 'find', undefined, C); button(50 + 2 * bw, 176, bw, 56, '＋ Feed', 'feed', undefined, C); button(30, 240, bw, 52, '🗂 Board', 'open', undefined, C); button(40 + bw, 240, bw, 52, '🎲 Any part', 'random', undefined, C, 'rgba(38,198,218,0.3)'); button(50 + 2 * bw, 240, bw, 52, '# Number', 'number', undefined, C); y = 300; }
        else if (sub.startsWith('famx:')) { const f = FAMILIES.find((x) => x.id === sub.slice(5)); if (f) { y = 150 + wrapped(SERIES[f.id] ? `${f.says}. The catalogue: ${SERIES[f.id]!.says} (${catalogue(f.id).length} sizes).` : f.says, 40, 150, 16, W - 80, '#ffffff', 4); f.params.forEach((q) => { text(`${q.says}: ${q.values ? q.values.join(', ') : `${q.min}–${q.max} ${q.unit}`}`, 40, y + 18, 14, '#b2ebf2', 500, W - 80); y += 22; }); y += 8; } }
      }
      // the rows leave room at the foot for what was said
      const sd0 = said || h.said(), rows = list(sub).slice(v.page * per, v.page * per + per), rh = Math.min(68, (bottom - y - (sd0 ? 110 : 60)) / per - 6);
      rows.forEach((r, j) => { const ry = y + j * (rh + 6); g.fillStyle = 'rgba(38,198,218,0.10)'; g.beginPath(); g.roundRect(30, ry, W - 60, rh, 12); g.fill(); text(r.label, 46, ry + rh * 0.45, 17, '#ffffff', 600, W - 92); text(r.note, 46, ry + rh * 0.8, 13, '#b2ebf2', 400, W - 92); hit(30, ry, W - 30, ry + rh, r.act, r.arg); });
      const sd = said || h.said(); if (sd) wrapped(sd, 40, bottom - 40, 14, W - 80, '#ffd740', 2);
    },
    act(act, arg, nav: Nav) {
      switch (act) {
        case 'go': said = ''; nav.go(String(arg)); return true;
        case 'make': { const i = INVENTORY.get(String(arg)); if (i) { h.make(i.id); said = `Making ${i.name} in the workshop, everything in it first.`; } return true; }
        case 'board': said = h.board(String(arg)); return true;
        case 'tree': said = h.tree(String(arg)); return true;
        case 'random': { const n = randomPart(), p = partAt(n)!, x = resolve(p.words); if (x && typeof x === 'object') { said = `Part ${n.toLocaleString('en-GB')}: ${p.words}`; nav.go(`item:${(x as Item).id}`); } else said = String(x); return true; }
        case 'number': nav.write(`a part number, 0 to ${(spaceSize().total - 1).toLocaleString('en-GB')}`, (t) => { const n = Number(t.replace(/[^\d]/g, '')), p = partAt(n); if (!p) { said = `No part ${t}: 0 to ${(spaceSize().total - 1).toLocaleString('en-GB')}.`; nav.redraw(); return; } const x = resolve(p.words); if (x && typeof x === 'object') { said = `Part ${n.toLocaleString('en-GB')}: ${p.words}`; nav.go(`item:${(x as Item).id}`); } nav.redraw(); }); return true;
        case 'see': said = h.see(String(arg)); return true;
        case 'behave': { const i = INVENTORY.get(String(arg)); if (i) { const r = behave(i, '', FAMILIES, callFamily); said = typeof r === 'string' ? r : `${r.lines.join(' ')} [${r.law}]`; } return true; }
        case 'bom': { const i = INVENTORY.get(String(arg)); if (i) { const b = flatBom(i.id), m = massOf(i.id); said = `${typeOf(i)}: to make one, buy ${b.buy.filter((r) => r.how === 'bought').length} kinds of part and take ${b.buy.filter((r) => r.how === 'stock').length} materials from stock; make ${b.made.length} kinds here.${m.g ? ` About ${m.g >= 1000 ? `${(m.g / 1000).toFixed(2)} kg` : `${m.g.toFixed(0)} g`} where the masses are known.` : ''} Most of: ${b.buy.slice(0, 4).map((r) => `${r.n} × ${r.name}`).join(', ')}.`; } return true; }
        case 'open': said = h.open(); return true;
        case 'fam': { const x = resolve(String(arg)); if (x && typeof x === 'object') { said = ''; nav.go(`item:${(x as Item).id}`); } else said = String(x ?? 'not found'); return true; }
        case 'find': nav.write('a part, or a size of one: "nema17", "screw M4x20", "bearing 6201", "gear m1 z30"', (t) => { const x = resolve(t); if (x && typeof x === 'object') nav.go(`item:${(x as Item).id}`); else said = String(x ?? `Nothing called "${t}".`); nav.redraw(); }); return true;
        case 'feed': nav.write('entries: id | name | Category/Sub | kind | process | child*n child | what it is   (;; between entries)', (t) => { said = h.feed(t); nav.redraw(); }); return true;
      }
      return false;
    },
  };
}

export interface LibraryHost { /** stand it before you, drawn 1:1 to its standard, to take apart */ see(words: string): string }
/** The library on the phone: every kind of part it draws whole from its standard, by trade, each in every size it is
 *  sold in, with what the drawing weighs against what its standard says; press a size and it stands before you, drawn,
 *  to take apart piece by piece down to its elements. Three presses from home to any part. */
export function libraryApp(h: LibraryHost): PhoneApp {
  const C = '#ffd740', per = 8, BIG = 40; let said = '';
  const fams = (): Family[] => DESIGNED.map((id) => FAMILIES.find((f) => f.id === id)).filter((f): f is Family => !!f);
  const trade = (f: Family) => f.path.slice(0, 2).join(' › ');
  const sizes = (f: Family): string[] => { const l = catalogue(f.id); return l.length ? l : f.examples; };
  type Row = { label: string; note: string; act: string; arg: string };
  const list = (sub: string): Row[] => {
    if (sub === '') { const by = new Map<string, Family[]>(); for (const f of fams()) (by.get(trade(f)) ?? by.set(trade(f), []).get(trade(f))!).push(f); return [...by].sort((a, b) => b[1].length - a[1].length).map(([t, fs]) => ({ label: t, note: `${fs.length} kind${fs.length > 1 ? 's' : ''} of part · ${fs.reduce((a, f) => a + sizes(f).length, 0).toLocaleString('en-GB')} sizes`, act: 'go', arg: `t:${t}` })); }
    if (sub.startsWith('t:')) return fams().filter((f) => trade(f) === sub.slice(2)).map((f) => ({ label: f.name, note: `${sizes(f).length} size${sizes(f).length > 1 ? 's' : ''} · ${f.path.slice(2).join(' › ') || f.says.slice(0, 50)}`, act: 'go', arg: `f:${f.id}` }));
    if (sub.startsWith('f:')) {
      // (a family of thousands of sizes, a chip resistor's, opens by its sizes' words in turn, its case, then its
      // tolerance, then its values a page of them at a time: never more than a few presses to any one)
      const { f, pre, from } = at(sub); if (!f) return [];
      const ws = sizes(f).filter((w) => { const t = w.split(/\s+/).slice(1); return pre.every((x, i) => t[i] === x); });
      if (ws.length <= BIG) return ws.map((w) => ({ label: w, note: '', act: 'see', arg: w }));
      if (from !== null) return ws.slice(from, from + BIG).map((w) => ({ label: w, note: '', act: 'see', arg: w }));
      const next = new Map<string, number>(); for (const w of ws) { const v = w.split(/\s+/)[pre.length + 1] ?? ''; next.set(v, (next.get(v) ?? 0) + 1); }
      const head = `${f.id}|${pre.join(' ')}`;
      if (next.size > 1 && next.size < ws.length) return [...next].map(([v, n]) => ({ label: `${f.name} ${[...pre, v].join(' ')}`, note: `${n} size${n > 1 ? 's' : ''}`, act: 'go', arg: `f:${f.id}|${[...pre, v].join(' ')}` }));
      return Array.from({ length: Math.ceil(ws.length / BIG) }, (_, k) => { const a = ws[k * BIG]!, b = ws[Math.min(ws.length, (k + 1) * BIG) - 1]!, last = (w: string) => w.split(/\s+/).slice(pre.length + 1).join(' '); return { label: `${last(a)} – ${last(b)}`, note: `${Math.min(BIG, ws.length - k * BIG)} sizes`, act: 'go', arg: `f:${head}#${k * BIG}` }; });
    }
    return [];
  };
  /** Where a family's list is: its family, the words its sizes start with, the first of a run of them. */
  const at = (sub: string) => { const m = /^f:([^|#]+)(?:\|([^#]*))?(?:#(\d+))?$/.exec(sub); return { f: m ? FAMILIES.find((x) => x.id === m[1]) : undefined, pre: m?.[2] ? m[2].split(' ').filter(Boolean) : [], from: m?.[3] !== undefined ? Number(m[3]) : null }; };
  return {
    id: 'library', name: 'Library', icon: '🔩', colour: C,
    pages: (sub) => Math.max(1, Math.ceil(list(sub).length / per)),
    draw(k: Kit, v: View) {
      const { text, wrapped, g, W, bottom, hit } = k, sub = v.sub, here = sub.startsWith('f:') ? at(sub) : null, f = here?.f;
      text(sub === '' ? 'Library' : f ? [f.name, ...here!.pre].join(' ') : sub.slice(2), 40, 118, sub === '' ? 44 : 28, C, 800, W - 80);
      wrapped(sub === '' ? `${DESIGNED.length} kinds of part, each drawn whole from its standard, every piece inside it drawn too. Press one to see it before you, 1:1.` : f ? f.says : 'press one for its sizes', 40, 148, 15, W - 80, '#ffe9a8', 2);
      const y0 = 196, rows = list(sub).slice(v.page * per, v.page * per + per), rh = Math.min(84, (bottom - y0 - (said ? 110 : 50)) / per - 6);
      rows.forEach((r, j) => {
        const ry = y0 + j * (rh + 6);
        // (a size's line says what its drawing weighs against its standard, and whether its own check holds: drawn when shown)
        let note = r.note; if (r.act === 'see') { const c = component(r.arg); note = typeof c === 'string' ? c : `${grams(partMass(c.part) * 1000)} drawn${c.item.g ? `, ${grams(c.item.g)} by its standard` : ''} · ${c.faults.length ? `⚠ ${c.faults[0]}` : 'whole, every piece in it'}`; }
        g.fillStyle = 'rgba(255,215,64,0.10)'; g.beginPath(); g.roundRect(30, ry, W - 60, rh, 12); g.fill();
        text(r.label, 46, ry + rh * 0.42, 19, '#ffffff', 600, W - 130); text(note, 46, ry + rh * 0.78, 14, '#ffe9a8', 500, W - 130);
        text(r.act === 'see' ? '🧊' : '›', W - 74, ry + rh * 0.6, 24, C, 700, 40);
        hit(30, ry, W - 30, ry + rh, r.act, r.arg);
      });
      if (said) wrapped(said, 40, bottom - 40, 15, W - 80, C, 3);
    },
    act(act, arg, nav: Nav) {
      switch (act) {
        case 'go': said = ''; nav.go(String(arg)); return true;
        case 'see': said = h.see(String(arg)); return true;
      }
      return false;
    },
  };
}

// ---- charts on a phone's screen -----------------------------------------------------------------------------------------
const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';
const INK = '#ffffff', INK2 = '#b2ebf2', INK3 = '#7fa9b5', RULE = 'rgba(255,255,255,0.14)';
/** Words ending at x: values in a column line up on their right. */
function right(k: Kit, s: string, x: number, y: number, size: number, colour = INK, weight = 600): void { k.g.font = `${weight} ${size}px ${FONT}`; const w = k.g.measureText(s).width; k.text(s, x - w, y, size, colour, weight, w + 4); }
/** A line over time: one series, 2 px, its least and greatest marked and said, the hours under it every few steps. */
function lineChart(k: Kit, x: number, y: number, w: number, h: number, pts: number[], o: { colour: string; unit: string; ticks?: string[]; every?: number; act?: string }): void {
  const { g } = k; if (pts.length < 2) { k.text('sampled every 10 s: the line starts at the second sample', x, y + h / 2, 14, INK3, 500, w); return; }
  const lo = Math.min(...pts), hi = Math.max(...pts), pad = (hi - lo) * 0.12 || 1, a = lo - pad, b = hi + pad;
  const X = (i: number) => x + (i / (pts.length - 1)) * w, Y = (v: number) => y + h - ((v - a) / (b - a)) * h;
  g.strokeStyle = RULE; g.lineWidth = 1; for (const v of [lo, hi]) { g.beginPath(); g.moveTo(x, Y(v)); g.lineTo(x + w, Y(v)); g.stroke(); }
  g.strokeStyle = o.colour; g.lineWidth = 2; g.lineJoin = 'round'; g.beginPath(); pts.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)))); g.stroke();
  const fmt = (v: number) => `${Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, '')}${o.unit}`;
  for (const i of [pts.indexOf(hi), pts.indexOf(lo)]) { g.fillStyle = '#0a1a22'; g.beginPath(); g.arc(X(i), Y(pts[i]!), 6, 0, Math.PI * 2); g.fill(); g.fillStyle = o.colour; g.beginPath(); g.arc(X(i), Y(pts[i]!), 4.5, 0, Math.PI * 2); g.fill(); const s = fmt(pts[i]!), up = pts[i] === hi; k.g.font = `600 14px ${FONT}`; const tw = k.g.measureText(s).width; if (up) k.text(s, Math.min(x + w - tw, Math.max(x, X(i) - tw / 2)), Y(pts[i]!) - 10, 14, INK, 600, tw + 4); else k.text(s, X(i) + tw + 14 > x + w ? X(i) - tw - 10 : X(i) + 10, Y(pts[i]!) - 6, 14, INK, 600, tw + 4); }
  if (o.ticks) { const ev = o.every ?? 3; o.ticks.forEach((t, i) => { if (i % ev === 0) k.text(t, Math.min(x + w - 30, X(i) - 14), y + h + 20, 12, INK3, 500, 40); }); }
  if (o.act) pts.forEach((_, i) => k.hit(X(i) - w / pts.length / 2, y - 10, X(i) + w / pts.length / 2, y + h + 24, o.act!, i));
}
/** Columns from a baseline: 2 px apart, their tops rounded 4 px; the greatest said. */
function columns(k: Kit, x: number, y: number, w: number, h: number, vals: number[], max: number, o: { colour: string; unit: string; act?: string }): void {
  const { g } = k, n = vals.length, cw = w / n;
  g.strokeStyle = RULE; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y + h + 0.5); g.lineTo(x + w, y + h + 0.5); g.stroke();
  vals.forEach((v, i) => { const bh = Math.max(v > 0 ? 2 : 0, (v / max) * h); g.fillStyle = o.colour; g.beginPath(); g.roundRect(x + i * cw + 1, y + h - bh, cw - 2, bh, [4, 4, 0, 0]); g.fill(); if (o.act) k.hit(x + i * cw, y - 10, x + (i + 1) * cw, y + h + 6, o.act, i); });
  const top = vals.indexOf(Math.max(...vals)); if (vals[top]! > 0) { const s = `${Math.round(vals[top]!)}${o.unit}`; k.g.font = `600 13px ${FONT}`; const tw = k.g.measureText(s).width; k.text(s, Math.min(x + w - tw, Math.max(x, x + (top + 0.5) * cw - tw / 2)), y + h - (vals[top]! / max) * h - 6, 13, INK, 600, tw + 4); }
}
/** Bars across, each named with its value: to compare things, not times. */
function bars(k: Kit, x: number, y: number, w: number, rows: { label: string; v: number; max: number; note?: string; colour?: string }[], colour: string, rh = 40): number {
  const { g } = k, lw = Math.min(170, w * 0.36);
  rows.forEach((r, j) => { const ry = y + j * rh; k.text(r.label, x, ry + rh * 0.62, 15, INK, 600, lw - 8); const bw = Math.max(r.v > 0 ? 3 : 0, (Math.min(r.v, r.max) / r.max) * (w - lw - 70)); g.fillStyle = 'rgba(255,255,255,0.07)'; g.beginPath(); g.roundRect(x + lw, ry + rh * 0.3, w - lw - 70, rh * 0.4, 4); g.fill(); g.fillStyle = r.colour ?? colour; g.beginPath(); g.roundRect(x + lw, ry + rh * 0.3, bw, rh * 0.4, [0, 4, 4, 0]); g.fill(); right(k, r.note ?? String(Math.round(r.v)), x + w, ry + rh * 0.62, 14, INK2, 600); });
  return rows.length * rh;
}

// ---- the weather ------------------------------------------------------------------------------------------------------
export interface WeatherHost { forecast(): Forecast | null; note(): string; here(): void; find(name: string): Promise<Place[] | string>; pick(p: Place): void; recent(): Place[]; rules(): string; said(): string }
const LEVEL = { ok: ['✓', 'OK', '#69f0ae'], mind: ['!', 'MIND', '#ffd740'], stop: ['✕', 'STOP', '#ff8a80'] } as const;
const dayName = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
/** The weather on the phone: where you are or a place you name; now, the next twelve hours (temperature, and the chance of
 *  rain, each its own chart), the week, and what it means for casting, filament, a drone and a solar panel here; and the
 *  rules that start on it. Open-Meteo's numbers, said as they come; where it cannot be reached, it says so. */
export function weatherApp(h: WeatherHost): PhoneApp {
  const C = '#4fc3f7'; let said = '', found: Place[] = [];
  return {
    id: 'weather', name: 'Weather', icon: '🌦', colour: C,
    draw(k: Kit, v: View) {
      const { text, wrapped, button, g, W, bottom, hit } = k, f = h.forecast(), sub = v.sub;
      if (sub === 'found') {
        text('Which place?', 40, 118, 34, C, 800);
        found.forEach((p, j) => { const ry = 150 + j * 74; g.fillStyle = 'rgba(79,195,247,0.12)'; g.beginPath(); g.roundRect(30, ry, W - 60, 66, 12); g.fill(); text(placeName(p), 46, ry + 30, 18, INK, 600, W - 92); text(`${p.lat.toFixed(2)}°, ${p.lon.toFixed(2)}°${p.tz ? ` · ${p.tz}` : ''}`, 46, ry + 54, 13, INK2, 400, W - 92); hit(30, ry, W - 30, ry + 66, 'pick', j); });
        button(30, bottom - 70, W - 60, 56, '← Back', 'go', '', C); return;
      }
      if (!f) {
        text('Weather', 40, 118, 38, C, 800);
        let y = 150 + wrapped(h.note() || 'No forecast yet: find where you are, or name a place.', 40, 150, 17, W - 80, INK2, 4);
        const bw = (W - 70) / 2; button(30, y + 10, bw, 60, '📍 Where I am', 'here', undefined, C, 'rgba(79,195,247,0.3)'); button(40 + bw, y + 10, bw, 60, '⌕ Find a place', 'find', undefined, C); y += 90;
        const rec = h.recent(); if (rec.length) { text('Places you looked at', 40, y + 10, 16, C, 700); rec.slice(0, 6).forEach((p, j) => { const ry = y + 24 + j * 62; g.fillStyle = 'rgba(79,195,247,0.10)'; g.beginPath(); g.roundRect(30, ry, W - 60, 54, 12); g.fill(); text(placeName(p), 46, ry + 34, 17, INK, 600, W - 92); hit(30, ry, W - 30, ry + 54, 'recent', j); }); }
        const sd = said || h.said(); if (sd) wrapped(sd, 40, bottom - 40, 14, W - 80, '#ffd740', 2);
        return;
      }
      const n = f.now;
      if (sub === 'week') {
        text(`The week · ${f.place.name}`, 40, 118, 30, C, 800, W - 80);
        const lo = Math.min(...f.days.map((d) => d.lo)), hi = Math.max(...f.days.map((d) => d.hi)), x0 = 276, x1 = W - 96;
        f.days.forEach((d, j) => {
          const ry = 150 + j * 92; g.fillStyle = j % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(79,195,247,0.07)'; g.fillRect(30, ry, W - 60, 88);
          text(j ? dayName(d.date) : 'Today', 44, ry + 32, 18, INK, 700, 100); text(`${skyIcon(d.code)} ${sky(d.code)}`, 44, ry + 62, 14, INK2, 500, 180);
          const X = (t: number) => x0 + ((t - lo) / (hi - lo || 1)) * (x1 - x0);
          g.fillStyle = 'rgba(255,255,255,0.08)'; g.beginPath(); g.roundRect(x0, ry + 22, x1 - x0, 8, 4); g.fill();
          g.fillStyle = C; g.beginPath(); g.roundRect(X(d.lo), ry + 22, Math.max(6, X(d.hi) - X(d.lo)), 8, 4); g.fill();
          right(k, `${d.lo.toFixed(0)}°`, x0 - 10, ry + 31, 15, INK2, 600); text(`${d.hi.toFixed(0)}°`, x1 + 10, ry + 31, 15, INK, 700, 44);
          text(`rain ${d.rain.toFixed(1)} mm · ${d.rainChance} % · UV ${d.uv.toFixed(0)} · wind ${d.wind.toFixed(0)} m/s`, 230, ry + 62, 13, INK2, 500, W - 270);
        });
        button(30, bottom - 70, W - 60, 56, '← Now', 'go', '', C); return;
      }
      if (sub === 'make') {
        text('What it means here', 40, 118, 32, C, 800);
        let y = 140; for (const a of forMaking(f)) { const [ic, word, col] = LEVEL[a.level]; g.fillStyle = 'rgba(255,255,255,0.05)'; const hh = 46 + 19 * Math.min(6, Math.ceil(a.says.length / 52)); g.beginPath(); g.roundRect(30, y, W - 60, hh, 12); g.fill(); g.fillStyle = col; g.fillRect(30, y, 5, hh); text(`${ic} ${word}`, 48, y + 28, 15, col, 800, 90); text(a.what, 130, y + 28, 18, INK, 700, W - 170); wrapped(a.says, 48, y + 52, 14, W - 96, INK2, 6); y += hh + 10; }
        text('Numbers from the forecast; where each limit comes from is in its line.', 40, Math.min(bottom - 80, y + 18), 13, INK3, 500, W - 80);
        button(30, bottom - 70, W - 60, 56, '← Now', 'go', '', C); return;
      }
      text(placeName(f.place), 40, 112, 22, C, 800, W - 80);
      text(`${skyIcon(n.code, n.day)} ${n.temp.toFixed(0)}°`, 36, 196, 74, INK, 800, 280);
      text(sky(n.code), 300, 158, 20, INK, 700, W - 330); text(`feels ${n.feels.toFixed(0)}°`, 300, 186, 17, INK2, 500, W - 330);
      text(`💧 ${n.humidity.toFixed(0)} %   🌬 ${n.wind.toFixed(1)} m/s ${compass(n.windFrom)}${n.gusts > n.wind + 1 ? `, gusts ${n.gusts.toFixed(1)}` : ''}   ${n.pressure.toFixed(0)} hPa`, 40, 236, 16, INK, 500, W - 80);
      const d0 = f.days[0]; text(`☀ ${n.sun.toFixed(0)} W/m² now${d0 ? ` · UV ${d0.uv.toFixed(1)} · up ${d0.sunrise.slice(11)} · down ${d0.sunset.slice(11)}` : ''}`, 40, 262, 15, INK2, 500, W - 80);
      const hrs = f.hours.slice(0, 12), ticks = hrs.map((x) => x.time.slice(11, 13));
      text('Temperature, °C, the next 12 hours', 40, 302, 15, C, 700); lineChart(k, 50, 316, W - 100, 110, hrs.map((x) => x.temp), { colour: C, unit: '°', ticks, act: 'hour' });
      text(`Chance of rain, %: ${rainAhead(f)} % at most in 6 h`, 40, 482, 15, C, 700); columns(k, 50, 496, W - 100, 80, hrs.map((x) => x.rainChance), 100, { colour: '#81d4fa', unit: ' %', act: 'hour' });
      hrs.forEach((x, i) => { if (i % 3 === 0) text(x.time.slice(11, 16), 50 + (i + 0.5) * ((W - 100) / 12) - 18, 598, 12, INK3, 500, 44); });
      const bw = (W - 80) / 3;
      button(30, 620, bw, 58, '🗓 Week', 'go', 'week', C); button(40 + bw, 620, bw, 58, '🛠 Making', 'go', 'make', C); button(50 + 2 * bw, 620, bw, 58, '⚡ Rules', 'rules', undefined, C);
      button(30, 688, (W - 70) / 2, 54, '📍 Where I am', 'here', undefined, C); button(40 + (W - 70) / 2, 688, (W - 70) / 2, 54, '⌕ Find a place', 'find', undefined, C);
      text(`Open-Meteo, for ${n.time.slice(11)} in ${f.tz} · fetched ${new Date(f.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 40, 768, 12, INK3, 500, W - 80);
      const sd = said || h.said(); if (sd) wrapped(sd, 40, Math.min(bottom - 40, 790), 14, W - 80, '#ffd740', 3);
    },
    act(act, arg, nav: Nav) {
      const f = h.forecast();
      switch (act) {
        case 'go': said = ''; nav.go(String(arg)); return true;
        case 'here': said = 'Asking this device where it is…'; h.here(); return true;
        case 'find': nav.write('a town or city: "Lagos", "Leeds", "Denver"', (t) => { said = `Looking for ${t}…`; nav.redraw(); void h.find(t).then((r) => { if (typeof r === 'string') { said = r; nav.redraw(); return; } found = r; if (r.length === 1) { h.pick(r[0]!); said = ''; } else { said = ''; nav.go('found'); } nav.redraw(); }); }); return true;
        case 'pick': { const p = found[Number(arg)]; if (p) { h.pick(p); said = `Fetching ${placeName(p)}…`; nav.go(''); } return true; }
        case 'recent': { const p = h.recent()[Number(arg)]; if (p) { h.pick(p); said = `Fetching ${placeName(p)}…`; } return true; }
        case 'rules': said = h.rules(); return true;
        case 'hour': { const x = f?.hours[Number(arg)]; if (x) said = `${x.time.slice(11, 16)}: ${x.temp.toFixed(1)} °C, ${sky(x.code)}, ${x.rainChance} % chance of rain, sunlight ${x.sun.toFixed(0)} W/m²`; return true; }
      }
      return false;
    },
  };
}

// ---- data: what the forge has done, in numbers ----------------------------------------------------------------------------
export interface DataStat { label: string; value: string }
export interface DataSection { id: string; name: string; icon: string; colour: string; stats: DataStat[]; series?: { name: string; unit: string; points: number[]; ticks?: string[] }; bars?: { name: string; rows: { label: string; v: number; max: number; note?: string }[] }; note?: string }
/** Data on the phone: each part of the forge in numbers (its pipelines, boards, robots, workshop, inventory, devices,
 *  Claude, the weather), a tile each; press one for its numbers and its chart: a line where it is over time, bars where
 *  things are compared. Counted from what the forge keeps, nothing estimated. */
export function dataApp(h: { sections(): DataSection[] }): PhoneApp {
  const C = '#b388ff';
  return {
    id: 'data', name: 'Data', icon: '📊', colour: C,
    draw(k: Kit, v: View) {
      const { text, wrapped, button, g, W, bottom, hit } = k, all = h.sections();
      if (v.sub.startsWith('sec:')) {
        const s = all.find((x) => x.id === v.sub.slice(4)); if (!s) { text('Not found', 40, 122, 30, C, 800); return; }
        text(`${s.icon} ${s.name}`, 40, 118, 34, s.colour, 800, W - 80);
        let y = 140; s.stats.forEach((st, j) => { const ry = y + j * 36; if (j % 2 === 0) { g.fillStyle = 'rgba(255,255,255,0.04)'; g.fillRect(30, ry, W - 60, 36); } text(st.label, 44, ry + 24, 15, INK2, 500, W * 0.55); right(k, st.value, W - 44, ry + 24, 16, INK, 700); });
        y += s.stats.length * 36 + 20;
        if (s.series) { text(s.series.name, 40, y + 10, 15, s.colour, 700, W - 80); lineChart(k, 50, y + 28, W - 100, 150, s.series.points, { colour: s.colour, unit: s.series.unit, ticks: s.series.ticks, every: Math.max(1, Math.ceil(s.series.points.length / 6)) }); y += 210; }
        if (s.bars && s.bars.rows.length) { text(s.bars.name, 40, y + 10, 15, s.colour, 700, W - 80); y += 18 + bars(k, 40, y + 18, W - 80, s.bars.rows.slice(0, Math.max(3, Math.floor((bottom - y - 120) / 40))), s.colour); }
        if (s.note) wrapped(s.note, 40, Math.min(bottom - 110, y + 24), 13, W - 80, INK3, 3);
        button(30, bottom - 70, W - 60, 56, '← All', 'go', '', C); return;
      }
      text('Data', 40, 118, 38, C, 800); text('the forge in numbers: press one for its chart', 40, 146, 15, INK2, 500);
      const cols = 2, tw = (W - 60 - 12) / cols, th = Math.min(150, (bottom - 170) / Math.ceil(all.length / cols) - 12);
      all.forEach((s, j) => { const x = 30 + (j % cols) * (tw + 12), y = 166 + Math.floor(j / cols) * (th + 12); g.fillStyle = 'rgba(255,255,255,0.05)'; g.beginPath(); g.roundRect(x, y, tw, th, 14); g.fill(); g.fillStyle = s.colour; g.fillRect(x, y + 14, 4, th - 28); text(`${s.icon} ${s.name}`, x + 18, y + 32, 17, s.colour, 800, tw - 30); const [a, b] = s.stats; if (a) { text(a.value, x + 18, y + 72, 28, INK, 800, tw - 30); text(a.label, x + 18, y + 94, 13, INK2, 500, tw - 30); } if (b && th > 120) text(`${b.label}: ${b.value}`, x + 18, y + 120, 13, INK3, 500, tw - 30); hit(x, y, x + tw, y + th, 'go', `sec:${s.id}`); });
    },
    act(act, arg, nav: Nav) { if (act === 'go') { nav.go(String(arg)); return true; } return false; },
  };
}

// ---- the computer: programs for the boards and the arm, run here, and Claude beside them --------------------------------
export interface ComputerHost {
  /** run a program on its target here (Python against its board's libraries, the arm's commands on its controller) */ run(t: Target, code: string): Promise<Ran>;
  /** ask Claude about it: what Claude says, and the program changed where it changes it */ ask(t: Target, code: string, ask: string, out: string[]): Promise<{ said: string; code?: string }>;
  /** stand its board or its arm before you, drawn */ see(words: string): string;
  /** what it takes to have it for real: its build pack, opened */ buy?(t: Target): string;
}
/** The computer: every board and the arm, each with its maker's language and libraries; a program you can run here (its
 *  pins' changes and its prints shown, the arm moving before you), change by asking Claude in words, step through its
 *  examples, and take to the real thing by its steps. */
export function computerApp(h: ComputerHost): PhoneApp {
  const C = '#69f0ae', MONO = '"DejaVu Sans Mono", ui-monospace, monospace', ROWS = 17;
  type St = { code: string; ex: number; out: string[]; ran?: Ran; claude?: string; busy?: string };
  const st = new Map<string, St>();
  const of = (t: Target): St => { let x = st.get(t.id); if (!x) st.set(t.id, (x = { code: t.examples[0]!.code, ex: 0, out: [] })); return x; };
  const tOf = (sub: string) => TARGETS.find((t) => t.id === sub.slice(2));
  const lines = (t: Target) => of(t).code.replace(/\n$/, '').split('\n');
  return {
    id: 'computer', name: 'Computer', icon: '💻', colour: C,
    pages: (sub) => { const t = tOf(sub); return t && sub.startsWith('c:') ? Math.max(1, Math.ceil(lines(t).length / ROWS)) : 1; },
    draw(k: Kit, v: View) {
      const { text, wrapped, g, W, bottom, hit, button } = k, sub = v.sub, t = tOf(sub);
      if (!t) {
        text('Computer', 40, 118, 44, C, 800, W - 80);
        wrapped('Program the boards and the arm in their makers\' own languages; run it here, ask Claude to change it, and take it to the real thing step by step.', 40, 150, 15, W - 80, '#c8f7dc', 3);
        TARGETS.forEach((x, j) => { const y = 214 + j * 96; g.fillStyle = 'rgba(105,240,174,0.10)'; g.beginPath(); g.roundRect(30, y, W - 60, 86, 14); g.fill(); text(x.name, 46, y + 34, 19, '#ffffff', 600, W - 120); text(`${x.lang} · ${x.examples.length} program${x.examples.length > 1 ? 's' : ''} to start from`, 46, y + 64, 14, '#c8f7dc', 500, W - 120); text('›', W - 70, y + 52, 26, C, 700, 30); hit(30, y, W - 30, y + 86, 'open', x.id); });
        return;
      }
      const s0 = of(t);
      if (sub.startsWith('r:')) {
        text('On the real thing', 40, 118, 30, C, 800, W - 80); text(t.name, 40, 150, 16, '#c8f7dc', 600, W - 80);
        let y = 190; t.real.forEach((r, i) => { text(`${i + 1}`, 46, y + 20, 22, C, 800, 30); y += Math.max(54, wrapped(r, 84, y + 4, 16, W - 130, '#ffffff', 5) + 18); });
        y += 6; wrapped(`Its pins: ${t.pins}.`, 46, y, 14, W - 92, '#c8f7dc', 3);
        if (h.buy) button(40, bottom - 168, W - 80, 64, '🧰 What it takes: parts, prices, lessons', 'buy', t.id, '#ffb74d');
        button(40, bottom - 90, W - 80, 70, '‹ Back to the program', 'go', `c:${t.id}`, C);
        return;
      }
      // its program, a page of it, its lines numbered
      text(t.name, 40, 112, 21, C, 800, W - 80); text(`${t.examples[s0.ex]!.title} · ${t.lang}`, 40, 138, 14, '#c8f7dc', 500, W - 80);
      const ls = lines(t), top = 156, rh = 21; g.fillStyle = '#05140d'; g.beginPath(); g.roundRect(24, top, W - 48, ROWS * rh + 16, 10); g.fill();
      g.font = `500 14px ${MONO}`;
      ls.slice(v.page * ROWS, v.page * ROWS + ROWS).forEach((l, i) => { const n = v.page * ROWS + i + 1; g.fillStyle = '#3f7a5c'; g.fillText(String(n).padStart(2, ' '), 32, top + 22 + i * rh); g.fillStyle = /^\s*(#|\/\/)/.test(l) ? '#7fbf9a' : '#d7ffe9'; let x2 = l; while (g.measureText(x2).width > W - 110 && x2.length > 4) x2 = x2.slice(0, -2); g.fillText(x2 + (x2 !== l ? '…' : ''), 62, top + 22 + i * rh); });
      let y = top + ROWS * rh + 30;
      const bw = (W - 80 - 20) / 3;
      button(40, y, bw, 58, s0.busy === 'run' ? '… running' : '▶ Run', 'run', t.id, C); button(50 + bw, y, bw, 58, s0.busy === 'ask' ? '… asking' : '🤖 Ask Claude', 'ask', t.id, '#ffd740'); button(60 + 2 * bw, y, bw, 58, '📚 Next', 'next', t.id, '#80deea');
      y += 66; button(40, y, bw, 50, '🔧 For real', 'go', `r:${t.id}`, '#ffab91'); button(50 + bw, y, bw, 50, '🧊 See it', 'see', t.id, '#b39ddb'); button(60 + 2 * bw, y, bw, 50, '↺ Example', 'reset', t.id, '#cfd8dc');
      y += 66;
      // what it did: each pin's life as a bar, then its last lines; Claude's answer under them
      const r = s0.ran;
      if (r) {
        text(r.end === 'error' ? '✗ it stopped with an error' : `✓ ran ${r.t.toFixed(2)} s of its own time${r.end === 'stopped' ? ' (stopped at 10 s: it loops)' : ''}`, 40, y + 8, 15, r.end === 'error' ? '#ff8a80' : C, 700, W - 80); y += 20;
        const T = Math.max(r.t, 0.5); [...r.pins].slice(0, 3).forEach(([p, ch]) => {
          text(p, 40, y + 18, 13, '#c8f7dc', 600, 90); const x0 = 132, x1 = W - 40; g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x0, y + 6, x1 - x0, 16);
          ch.forEach(([t0, v0], i) => { const t1 = i + 1 < ch.length ? ch[i + 1]![0] : T; const f = Math.max(0, Math.min(1, v0 > 1 ? v0 / 100 : v0)); if (f > 0) { g.fillStyle = `rgba(105,240,174,${0.25 + 0.75 * f})`; g.fillRect(x0 + ((x1 - x0) * t0) / T, y + 6, Math.max(1, ((x1 - x0) * (t1 - t0)) / T), 16); } });
          y += 24;
        });
      }
      const said = [...(r?.said ?? []).slice(-3), ...s0.out.slice(-4)];
      said.forEach((l) => { g.font = `500 12px ${MONO}`; g.fillStyle = /✗|error|Error|\[10\d\d\]|\[30\d\d\]\[(?!End)/.test(l) ? '#ff8a80' : '#c8f7dc'; let x2 = l; while (g.measureText(x2).width > W - 80 && x2.length > 4) x2 = x2.slice(0, -2); g.fillText(x2, 40, y + 14); y += 17; });
      if (s0.claude) { y += 6; text('Claude', 40, y + 12, 15, '#ffd740', 800, 100); wrapped(s0.claude, 40, y + 22, 14, W - 80, '#ffe9a8', Math.max(2, Math.floor((bottom - y - 40) / 18))); }
    },
    act(act, arg, nav: Nav) {
      const t = TARGETS.find((x) => x.id === String(arg)) ?? tOf(nav.sub);
      switch (act) {
        case 'open': nav.go(`c:${arg}`); return true;
        case 'go': nav.go(String(arg)); return true;
        case 'next': { if (!t) return false; const s0 = of(t); s0.ex = (s0.ex + 1) % t.examples.length; s0.code = t.examples[s0.ex]!.code; s0.ran = undefined; s0.out = []; s0.claude = undefined; return true; }
        case 'reset': { if (!t) return false; const s0 = of(t); s0.code = t.examples[s0.ex]!.code; s0.ran = undefined; s0.out = []; return true; }
        case 'see': { if (!t) return false; of(t).out = [h.see(t.board)]; return true; }
        case 'buy': { if (!t || !h.buy) return false; h.buy(t); return true; }
        case 'run': {
          if (!t) return false; const s0 = of(t); if (s0.busy) return false; s0.busy = 'run'; s0.out = [];
          void h.run(t, s0.code).then((r) => { s0.ran = r; s0.out = [...r.out, ...[...r.pins].slice(0, 4).map(([p, ch]) => pinSays(p, ch))]; }, (e) => { s0.out = [`✗ ${(e as Error).message}`]; }).finally(() => { s0.busy = undefined; nav.redraw(); });
          return true;
        }
        case 'ask': {
          if (!t) return false; const s0 = of(t);
          nav.write('Ask Claude about this program (say what it should do)', (words) => {
            s0.busy = 'ask'; nav.redraw();
            void h.ask(t, s0.code, words, s0.out).then((a) => { s0.claude = a.said; if (a.code) { s0.code = a.code; s0.ran = undefined; } }, (e) => { s0.claude = `Could not ask: ${(e as Error).message}`; }).finally(() => { s0.busy = undefined; nav.redraw(); });
          });
          return true;
        }
      }
      return false;
    },
  };
}

export interface PackHost {
  /** the pack being looked at, if any */ now(): Pack | null;
  /** a new pack from words (what you want, what you have, your budget): made the one looked at */ make(asked: string): Pack;
  /** its page and files, saved as one zip: what was done */ save(): string;
  /** what it makes, stood before you */ see(): string;
}
/** The build pack: what you asked for priced at its cheapest real offer and where, the bench its steps need, the part to
 *  have made and who makes it cheapest, what would spend less, and a lesson for every step, gone through one step at a
 *  time, each done when its check is. */
export function packApp(h: PackHost): PhoneApp {
  const C = '#ffb74d', ROWS = 6, QUICK = ['Pico 2 W and an LED, I have a laptop', 'Pi 5, a plate for it, soldering kit, under $250', 'RDK X5 8GB and a Pi 5 on one plate, I have a computer'];
  const step = new Map<string, number>();
  const SECT: Record<string, [string, string]> = { buy: ['Buy', '🛒'], bench: ['Bench', '🔧'], helps: ['Nice to have', '➕'], have: ['You have', '✓'] };
  const of = (p: Pack, s: string) => p.lines.filter((l) => l.section === s);
  const cost = (l: Line) => (l.usd == null ? 'not priced' : usd(l.usd + l.needs.reduce((a, x) => a + x.usd, 0)));
  const range = (x: [number, number]) => (x[0] === x[1] ? usd(x[0]) : `${usd(x[0])}–${usd(x[1])}`);
  return {
    id: 'pack', name: 'Build pack', icon: '🧰', colour: C,
    pages: (sub) => { const p = h.now(); if (!p) return 1; if (SECT[sub]) return Math.max(1, Math.ceil(of(p, sub).length / ROWS)); if (sub === 'learn') return Math.max(1, Math.ceil(p.lessons.length / ROWS)); return 1; },
    draw(k: Kit, v: View) {
      const { text, wrapped, g, W, bottom, button } = k, p = h.now(), sub = v.sub;
      const back = (to = '', label = '‹ Back') => button(40, bottom - 76, W - 80, 60, label, 'go', to, '#cfd8dc');
      if (!p) {
        text('Build pack', 40, 118, 44, C, 800, W - 80);
        wrapped('Say what you want to make, what you have and what you would spend. It finds every part at its cheapest real price and where, the tools the steps need, the custom part and who makes it cheapest, and a lesson for every step.', 40, 150, 15, W - 80, '#ffe0b2', 5);
        QUICK.forEach((q, j) => button(40, 270 + j * 76, W - 80, 64, q, 'quick', q, C));
        button(40, 270 + QUICK.length * 76 + 10, W - 80, 64, '✎ Say what you want', 'new', undefined, '#ffd740');
        return;
      }
      if (!sub) {
        text('Build pack', 40, 112, 30, C, 800, W - 80); wrapped(p.asked, 40, 132, 14, W - 80, '#ffe0b2', 2);
        text(range(p.total.all), 40, 200, 40, '#ffffff', 800, W - 80);
        const over = p.budget != null && p.total.all[0] > p.budget, m0 = p.made[0];
        // what the total is, and is not: the parts and the bench, and the plate made with its shipping and tariff as
        // estimated; not the nice-to-haves, tax, or the shops' own shipping
        wrapped(`Buy + bench${m0 ? ` + the plate made (${m0.best.lo == null ? 'its quote, not in this' : 'shipping and tariff estimated'})` : ''}. Not in it: ${p.total.helps ? `nice-to-haves (${usd(p.total.helps)}), ` : ''}tax, the shops' shipping.`, 40, 222, 13, W - 80, '#ffe0b2', 2);
        const sellers = [...new Set(p.lines.flatMap((l) => (l.offer && l.section !== 'have' ? [l.offer.seller.replace(/ \(.*\)$/, '')] : [])))];
        text(`${p.budget != null ? `${over ? '✗ over' : '✓ within'} your ${usd(p.budget)} · ` : ''}seen ${p.lines.find((l) => l.offer)?.offer?.seen ?? ''} at ${sellers.slice(0, 3).join(', ')}${sellers.length > 3 ? ' …' : ''}`, 40, 278, 13, over ? '#ff8a80' : '#b9f6ca', 600, W - 80);
        wrapped(m0 ? `First: order the plate (it is made, then shipped), then buy the rest; learn while you wait.` : 'First: buy, then go through Learn in order.', 40, 294, 14, W - 80, '#ffffff', 2);
        let y = 348; const row = (label: string, to: string, col = C) => { button(40, y, W - 80, 54, label, 'go', to, col); y += 62; };
        for (const s0 of ['buy', 'bench', 'helps', 'have']) { const ls = of(p, s0); if (ls.length) row(`${SECT[s0]![1]} ${SECT[s0]![0]} · ${ls.length} · ${s0 === 'have' ? 'yours' : usd(ls.reduce((a, l) => a + (l.usd ?? 0), 0))}`, s0); }
        if (m0) row(`🏭 Plate · ${m0.best.who} · ${m0.best.lo == null ? 'its quote' : range([m0.best.lo, m0.best.hi!])}`, 'make');
        row(`📚 Learn · ${p.lessons.length} lessons`, 'learn', '#80cbc4');
        if (p.cheaper.length) row(`💸 Spend less · up to ${usd(Math.max(...p.cheaper.map((c) => c.saves)))}`, 'less', '#b9f6ca');
        if (p.notes.length + p.unknown.length) row(`📝 Good to know · ${p.notes.length + p.unknown.length}`, 'said', '#cfd8dc');
        const bw = (W - 80 - 20) / 3; y = Math.max(y + 6, bottom - 80);
        button(40, y, bw, 60, '✎ New', 'new', undefined, '#ffd740'); button(50 + bw, y, bw, 60, '💾 Save all', 'save', undefined, C); button(60 + 2 * bw, y, bw, 60, '🧊 See it', 'see', undefined, '#b39ddb');
        return;
      }
      if (SECT[sub]) {
        const ls = of(p, sub); text(SECT[sub]![0], 40, 112, 30, C, 800, W - 80);
        ls.slice(v.page * ROWS, v.page * ROWS + ROWS).forEach((l, j) => {
          const y = 132 + j * 92, i = p.lines.indexOf(l); g.fillStyle = 'rgba(255,183,77,0.10)'; g.beginPath(); g.roundRect(30, y, W - 60, 82, 12); g.fill(); k.hit(30, y, W - 30, y + 82, 'go', `i:${i}`);
          text(`${l.what}${l.n > 1 ? ` × ${l.n}` : ''}`, 44, y + 28, 16, '#ffffff', 600, W - 200); text(cost(l), W - 44 - g.measureText(cost(l)).width, y + 28, 17, C, 800, 150);
          text(l.offer ? `${l.offer.seller.replace(/ \(.*\)$/, '')}${l.offer.stock === 'out' ? ' · out of stock when seen' : ''}` : l.why, 44, y + 52, 13, l.offer?.stock === 'out' ? '#ff8a80' : '#ffe0b2', 500, W - 100);
          text(l.why, 44, y + 72, 12, '#bcaaa4', 400, W - 100);
        });
        return;
      }
      if (sub.startsWith('i:')) {
        const l = p.lines[Number(sub.slice(2))]; if (!l) { back(); return; }
        text(l.what, 40, 112, 22, C, 800, W - 80); let y = 128;
        if (l.offer) {
          y += wrapped(l.offer.name, 40, y + 6, 16, W - 80, '#ffffff', 3) + 10;
          text(`${cost(l)}${l.packs > 1 ? ` (${l.packs} × ${usd(l.offer.usd)})` : ''} · ${l.offer.seller}`, 40, y + 18, 15, C, 700, W - 80); y += 30;
          y += wrapped(l.offer.url, 40, y + 4, 13, W - 80, '#90caf9', 3) + 8;
          y += wrapped(`seen ${l.offer.seen}${l.offer.stock ? `, ${l.offer.stock === 'in' ? 'in stock' : 'out of stock'}` : ''}${l.offer.cond === 'used' ? ', used' : ''}${l.offer.note ? `. ${l.offer.note}` : ''}`, 40, y + 4, 13, W - 80, '#ffe0b2', 5) + 8;
        }
        y += wrapped(`Why: ${l.why}`, 40, y + 4, 14, W - 80, '#ffffff', 3) + 8;
        for (const n of l.needs) y += wrapped(`Needs ${n.offer.name}: ${usd(n.usd)} (${n.offer.seller})`, 40, y + 4, 13, W - 80, '#ffcc80', 3) + 6;
        if (l.others.length) { text('Also sold as', 40, y + 18, 14, C, 700, W - 80); y += 24; for (const o of l.others.slice(0, 3)) y += wrapped(`${o.name}: ${usd(o.usd)}${o.stock === 'out' ? ' (out of stock)' : ''}, ${o.seller}`, 40, y + 4, 13, W - 80, '#ffe0b2', 2) + 6; }
        back(l.section, `‹ ${SECT[l.section]![0]}`); return;
      }
      if (sub === 'make') {
        const m = p.made[0]; if (!m) { back(); return; }
        text('Make', 40, 112, 30, C, 800, W - 80); wrapped(`${m.profile.name}: ${m.profile.L.toFixed(1)} × ${m.profile.W.toFixed(1)} mm, ${m.profile.holes.length} holes. ${m.profile.why}.`, 40, 132, 14, W - 80, '#ffe0b2', 4);
        let y = 214; m.routes.forEach((r, j) => {
          const best = j === 0; g.fillStyle = best ? 'rgba(185,246,202,0.14)' : 'rgba(255,183,77,0.08)'; g.beginPath(); g.roundRect(30, y, W - 60, 70, 12); g.fill();
          text(`${best ? '★ ' : ''}${r.who}`, 44, y + 26, 16, best ? '#b9f6ca' : '#ffffff', 700, W - 220); const c = r.lo == null ? 'its quote' : range([r.lo, r.hi!]); text(c, W - 44 - g.measureText(c).width, y + 26, 16, C, 800, 160);
          text(`${r.how} · ${r.n} · ${r.file}`, 44, y + 52, 12, '#ffe0b2', 500, W - 100); y += 78;
        });
        if (m.faults.length) { y += wrapped(`✗ ${m.faults.join('; ')}`, 40, y + 8, 13, W - 80, '#ff8a80', 3) + 8; }
        const bw = (W - 80 - 10) / 2; button(40, bottom - 76, bw, 60, '💾 Files', 'save', undefined, C); button(50 + bw, bottom - 76, bw, 60, '🧊 See it', 'see', undefined, '#b39ddb');
        return;
      }
      if (sub === 'learn') {
        text('Learn', 40, 112, 30, C, 800, W - 80);
        p.lessons.slice(v.page * ROWS, v.page * ROWS + ROWS).forEach((l, j) => { const done = (step.get(l.id) ?? 0) > l.steps.length; button(40, 132 + j * 72, W - 80, 62, `${done ? '✓' : `${(step.get(l.id) ?? 0) > 0 ? '…' : '○'}`} ${l.title}`, 'go', `k:${l.id}`, done ? '#b9f6ca' : '#80cbc4'); });
        if (p.noLesson.length) wrapped(`No lesson yet for: ${p.noLesson.join(', ')}`, 40, 132 + ROWS * 72 + 10, 13, W - 80, '#ffab91', 2);
        return;
      }
      if (sub.startsWith('k:')) {
        const l = p.lessons.find((x) => x.id === sub.slice(2)); if (!l) { back('learn', '‹ Lessons'); return; }
        const i = step.get(l.id) ?? 0; text(l.title, 40, 112, 21, '#80cbc4', 800, W - 80);
        let y = 132;
        if (i === 0) {
          y += wrapped(`${l.why[0]!.toUpperCase()}${l.why.slice(1)}.`, 40, y + 4, 15, W - 80, '#ffffff', 3) + 10;
          if (l.tools.length) y += wrapped(`Tools: ${l.tools.join(', ').replace(/-/g, ' ')}.`, 40, y + 4, 14, W - 80, '#ffe0b2', 3) + 10;
          if (l.safety.length) { text('⚠ First', 40, y + 18, 16, '#ffab91', 800, W - 80); y += 26; for (const s0 of l.safety) y += wrapped(`• ${s0}`, 40, y + 4, 14, W - 80, '#ffccbc', 4) + 6; }
        } else if (i <= l.steps.length) {
          const s0 = l.steps[i - 1]!; text(`Step ${i} of ${l.steps.length}`, 40, y + 22, 16, '#80cbc4', 700, W - 80); y += 44;
          y += wrapped(s0.do, 40, y + 6, 20, W - 80, '#ffffff', 9) + 18;
          if (s0.check) { text('Done when', 40, y + 18, 15, '#b9f6ca', 800, W - 80); y += 24; wrapped(s0.check, 40, y + 4, 16, W - 80, '#b9f6ca', 4); }
        } else { text('✓ Done', 40, y + 40, 34, '#b9f6ca', 800, W - 80); wrapped(`Source: ${l.src}.`, 40, y + 70, 13, W - 80, '#ffe0b2', 4); }
        const bw = (W - 80 - 10) / 2; button(40, bottom - 76, bw, 60, i === 0 || i > l.steps.length ? '‹ Lessons' : '‹ Step back', i === 0 || i > l.steps.length ? 'go' : 'step', i === 0 || i > l.steps.length ? 'learn' : `${l.id}|-1`, '#cfd8dc');
        if (i <= l.steps.length) button(50 + bw, bottom - 76, bw, 60, i === 0 ? 'Start ›' : i === l.steps.length ? 'Done ✓' : 'Done, next ›', 'step', `${l.id}|1`, '#80cbc4');
        return;
      }
      if (sub === 'less' || sub === 'said') {
        text(sub === 'less' ? 'Spend less' : 'Good to know', 40, 112, 30, C, 800, W - 80); let y = 128;
        const items = sub === 'less' ? p.cheaper.map((c) => `${c.say}: saves ${usd(c.saves)}`) : [...p.notes, ...p.unknown];
        for (const t of items) { if (y > bottom - 40) break; y += wrapped(`• ${t}`, 40, y + 6, 14, W - 80, sub === 'less' ? '#b9f6ca' : '#ffe0b2', 4) + 10; }
        return;
      }
      back();
    },
    act(act, arg, nav: Nav) {
      switch (act) {
        case 'go': nav.go(String(arg ?? '')); return true;
        case 'quick': h.make(String(arg)); nav.go(''); return true;
        case 'new': nav.write('What do you want to make? (what you have, and your budget, too)', (w) => { h.make(w); nav.go(''); }); return true;
        case 'save': h.save(); return true;
        case 'see': h.see(); return true;
        case 'step': { const [id, d] = String(arg).split('|'); const l = h.now()?.lessons.find((x) => x.id === id); if (!l) return false; step.set(id!, Math.max(0, Math.min(l.steps.length + 1, (step.get(id!) ?? 0) + Number(d)))); return true; }
      }
      return false;
    },
  };
}

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
