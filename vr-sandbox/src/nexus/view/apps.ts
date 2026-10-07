// Apps the forge adds to the phone: the Warehouse (your builds, kept on shelves; store the one on the table, bring one
// back to build it again, walk there and back) and the Robots (each by name: what it is doing, its battery, what it
// can do, its rules as a pipeline you can open, and what you can tell it: sleep, wake, charge, come, patrol, dance …).

import type { Kit, Nav, PhoneApp, View } from './phone';
import { ABILITIES, factName, type AbilityId, type Bot, type Fleet } from '../fleet';

/** A build kept in the warehouse: what it is called, what made it, how to make it again, and where it is shelved. */
export interface StoredBuild { id: string; title: string; ask?: string; kind: 'steps' | 'machine' | 'shapes'; steps?: string[]; footprint?: [number, number]; verdict?: string; kg?: number; slot?: string; at: number; parts: MiniPart[] }
/** A part of a stored build's model: its shape, where it is, how it is turned and stretched, and its look. */
export interface MiniPart { k: string; at: [number, number, number]; d: Record<string, number>; t: [number, number, number]; s: [number, number, number]; axis?: string; c: number; m: number; r: number }

export interface WarehouseHost { kept(): StoredBuild[]; store(): string; fetch(id: string): string; remove(id: string): string; go(place: 'warehouse' | 'table'): string; where(): 'warehouse' | 'table'; fleet: Fleet }
const AMBER = '#ffd600';

export function warehouseApp(h: WarehouseHost): PhoneApp {
  let said = '';
  const per = 5;
  return {
    id: 'warehouse', name: 'Warehouse', icon: '🏭', colour: AMBER,
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
