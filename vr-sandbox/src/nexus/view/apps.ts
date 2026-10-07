// Apps the forge adds to the phone: the Warehouse (your builds, kept on shelves; store the one on the table, bring one
// back to build it again, walk there and back) and the Robots (each by name: what it is doing, its battery, what it
// can do, its rules as a pipeline you can open, and what you can tell it: sleep, wake, charge, come, patrol, dance …).

import type { Kit, Nav, PhoneApp, View } from './phone';
import { ABILITIES, factName, type AbilityId, type Bot, type Fleet } from '../fleet';
import { METALS, RECIPES, bill, type Cell, type MadePart } from '../cell';
import { INVENTORY, categories, resolve, routeOf, summary, type Item } from '../inventory';
import { FAMILIES } from '../families';
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

export interface InventoryHost { make(words: string): void; board(id: string): string; tree(id: string): string; open(): string; feed(text: string): string; said(): string }
/** The inventory on the phone: its categories, down to each entry; what is inside it (press a part to go into it);
 *  making it; its pipeline and its tree on the board; the adjustable families and their sizes; and feeding it. */
export function inventoryApp(h: InventoryHost): PhoneApp {
  const C = '#26c6da', per = 9; let said = '';
  const list = (sub: string): { label: string; note: string; act: string; arg: string }[] => {
    if (sub === '') return [...categories().keys()].map((c) => ({ label: c, note: `${[...categories().get(c)!.values()].reduce((a, m) => a + [...m.values()].reduce((x, ids) => x + ids.length, 0), 0)} entries`, act: 'go', arg: `cat:${c}` }));
    if (sub.startsWith('cat:')) { const cat = sub.slice(4), subs = categories().get(cat); if (!subs) return []; return [...subs].flatMap(([sc, m]) => [...m].flatMap(([ss, ids]) => ids.filter((id) => !(INVENTORY.get(id)!.adjustable && !INVENTORY.get(id)!.family)).map((id) => { const i = INVENTORY.get(id)!; return { label: `${i.family ? '⚙ ' : ''}${i.name}`, note: [sc, ss].filter(Boolean).join(' › '), act: 'go', arg: `item:${id}` }; }))); }
    if (sub === 'fam') return FAMILIES.map((f) => ({ label: `⚙ ${f.name}`, note: f.examples.join(', '), act: 'go', arg: `famx:${f.id}` }));
    if (sub.startsWith('famx:')) { const f = FAMILIES.find((x) => x.id === sub.slice(5)); return f ? f.examples.map((ex) => ({ label: ex, note: 'press to see it, made to these sizes', act: 'fam', arg: ex })) : []; }
    if (sub.startsWith('item:')) { const i = INVENTORY.get(sub.slice(5)); return i ? i.of.map((c) => { const ci = INVENTORY.get(c.id)!, r = routeOf(ci); return { label: `${c.n > 1 ? `${c.n} × ` : ''}${ci.name}`, note: ci.kind === 'material' ? 'from stock' : r.bought ? 'bought' : `made here: ${r.process}`, act: 'go', arg: `item:${c.id}` }; }) : []; }
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
        text(i.name, 40, 118, 32, C, 800, W - 80); text(i.path.join(' › '), 40, 146, 15, '#b2ebf2', 500, W - 80);
        y = 172 + wrapped(i.says, 40, 172, 17, W - 80, '#ffffff', 3);
        if (i.spec) y += wrapped(i.spec, 40, y + 4, 15, W - 80, '#b2ebf2', 3) + 4;
        text(i.kind === 'material' ? 'a material: from stock' : r.bought ? `bought: ${r.why.replace(/^bought: /, '')}` : `made here: ${r.why}`, 40, y + 22, 15, r.bought ? '#ffb74d' : '#69f0ae', 600, W - 80); y += 30;
        if (sm) { text(`inside: ${sm.made} made here · ${sm.bought} bought · ${sm.stock} from stock · ${sm.depth} levels`, 40, y + 18, 15, '#e0f7fa', 500, W - 80); y += 26; }
        if (i.kind !== 'material') { const bw = (W - 80) / 3; button(30, y + 10, bw, 58, '▶ Make it', 'make', i.id, C, 'rgba(38,198,218,0.3)'); button(40 + bw, y + 10, bw, 58, '⚡ Pipeline', 'board', i.id, C); button(50 + 2 * bw, y + 10, bw, 58, '🌳 Tree', 'tree', i.id, C); y += 76; }
        text(i.of.length ? 'What is in it (press to go in)' : '', 40, y + 18, 16, C, 700); y += 26;
      } else {
        text(sub === '' ? 'Inventory' : sub === 'fam' ? 'Adjustable families' : sub.startsWith('famx:') ? `⚙ ${FAMILIES.find((f) => f.id === sub.slice(5))?.name ?? ''}` : sub.slice(4), 40, 118, 38, C, 800, W - 80);
        if (sub === '') { text(`${INVENTORY.size} entries · ${FAMILIES.length} adjustable families`, 40, 146, 16, '#b2ebf2', 500); const bw = (W - 80) / 3; button(30, 160, bw, 56, '⚙ Families', 'go', 'fam', C); button(40 + bw, 160, bw, 56, '⌨ Find / make', 'find', undefined, C); button(50 + 2 * bw, 160, bw, 56, '＋ Feed', 'feed', undefined, C); button(30, 224, W - 60, 52, '🗂 The inventory as a board', 'open', undefined, C); y = 284; }
        else if (sub.startsWith('famx:')) { const f = FAMILIES.find((x) => x.id === sub.slice(5)); if (f) { y = 150 + wrapped(f.says, 40, 150, 16, W - 80, '#ffffff', 3); f.params.forEach((q) => { text(`${q.says}: ${q.values ? q.values.join(', ') : `${q.min}–${q.max} ${q.unit}`}`, 40, y + 18, 14, '#b2ebf2', 500, W - 80); y += 22; }); y += 8; } }
      }
      const rows = list(sub).slice(v.page * per, v.page * per + per), rh = Math.min(68, (bottom - y - 60) / per);
      rows.forEach((r, j) => { const ry = y + j * (rh + 6); g.fillStyle = 'rgba(38,198,218,0.10)'; g.beginPath(); g.roundRect(30, ry, W - 60, rh, 12); g.fill(); text(r.label, 46, ry + rh * 0.45, 17, '#ffffff', 600, W - 92); text(r.note, 46, ry + rh * 0.8, 13, '#b2ebf2', 400, W - 92); hit(30, ry, W - 30, ry + rh, r.act, r.arg); });
      const sd = said || h.said(); if (sd) wrapped(sd, 40, bottom - 40, 14, W - 80, '#ffd740', 2);
    },
    act(act, arg, nav: Nav) {
      switch (act) {
        case 'go': said = ''; nav.go(String(arg)); return true;
        case 'make': { const i = INVENTORY.get(String(arg)); if (i) { h.make(i.id); said = `Making ${i.name} in the workshop, everything in it first.`; } return true; }
        case 'board': said = h.board(String(arg)); return true;
        case 'tree': said = h.tree(String(arg)); return true;
        case 'open': said = h.open(); return true;
        case 'fam': { const x = resolve(String(arg)); if (x && typeof x === 'object') { said = ''; nav.go(`item:${(x as Item).id}`); } else said = String(x ?? 'not found'); return true; }
        case 'find': nav.write('a part, or a size of one: "nema17", "screw M4x20", "bearing 6201", "gear m1 z30"', (t) => { const x = resolve(t); if (x && typeof x === 'object') nav.go(`item:${(x as Item).id}`); else said = String(x ?? `Nothing called "${t}".`); nav.redraw(); }); return true;
        case 'feed': nav.write('entries: id | name | Category/Sub | kind | process | child*n child | what it is   (;; between entries)', (t) => { said = h.feed(t); nav.redraw(); }); return true;
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
