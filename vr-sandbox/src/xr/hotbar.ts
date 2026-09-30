// The hotbar: nine slots along the bottom of the tablet holding what you used last (tools, parts, materials, joints),
// most recent first, kept on this headset. Tap a slot to pick it up again.

import type { Item } from './icons';

export const SLOTS = 9;
const KEY = 'vrsb.hotbar';

const DEFAULTS: Item[] = [
  { type: 'tool', id: 'grab' }, { type: 'part', id: 'block' }, { type: 'part', id: 'lumber' }, { type: 'part', id: 'plate' },
  { type: 'joint', id: 'auto' }, { type: 'material', id: 'steel.a36' }, { type: 'part', id: 'magnet.disc' }, { type: 'tool', id: 'erase' },
  { type: 'tool', id: 'inspect' },
];

export class Hotbar {
  items: Item[];

  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'> | null = globalThis.localStorage ?? null) {
    let saved: Item[] | null = null;
    try {
      const raw = this.storage?.getItem(KEY);
      const list = raw ? (JSON.parse(raw) as unknown) : null;
      if (Array.isArray(list)) saved = list.filter((x): x is Item => !!x && typeof x.type === 'string' && typeof x.id === 'string').slice(0, SLOTS);
    } catch {
      saved = null;
    }
    this.items = saved?.length ? saved : [...DEFAULTS];
  }

  /** Something was picked: to the front, once. */
  use(item: Item) {
    this.items = [item, ...this.items.filter((x) => !(x.type === item.type && x.id === item.id))].slice(0, SLOTS);
    try { this.storage?.setItem(KEY, JSON.stringify(this.items)); } catch { /* not kept */ }
  }
}
