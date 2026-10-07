// Apps the forge adds to the phone: the Warehouse (your builds, kept on shelves; store the one on the table, bring one
// back to build it again, walk there and back) and the Robots (each by name: what it is doing, its battery, what it
// can do, its rules as a pipeline you can open, and what you can tell it: sleep, wake, charge, come, patrol, dance …).

import type { Kit, Nav, PhoneApp, View } from './phone';
import { ABILITIES, factName, type AbilityId, type Bot, type Fleet } from '../fleet';
import { METALS, RECIPES, bill, type Cell, type MadePart } from '../cell';

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
