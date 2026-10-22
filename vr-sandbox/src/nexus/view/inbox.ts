// TO CLAUDE: the pile of things you want made real. A picture of what you were doing, a drawing, or just words —
// each one kept with what you asked for, so when Claude next opens this it reads the ask and the picture together.
//
// Everything is kept in THIS BROWSER (IndexedDB, because a screenshot is far too big for localStorage). Nothing is
// uploaded anywhere by itself: the page says so, and sending one is a thing you do, not a thing it does.
//
// Owner of: what you have asked Claude for, how it is kept, and the page that shows it.

export type Sort = 'shot' | 'drawing' | 'note';
export interface Item {
  id: string; sort: Sort; at: number;
  /** what you asked for, in your own words */ ask: string;
  /** where you were when you pressed the key, so a picture is not orphaned from its page */ from?: string;
  /** a PNG, for a shot or a drawing */ png?: Blob;
  /** sent off to Claude already, and when */ sent?: number;
}

const DB = 'nexus-inbox', STORE = 'items';

function open(): Promise<IDBDatabase> {
  return new Promise((ok, no) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'id' }); };
    r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
  });
}
const tx = async <T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await open();
  return new Promise<T>((ok, no) => { const q = f(db.transaction(STORE, mode).objectStore(STORE)); q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); });
};

export const put = (i: Item): Promise<unknown> => tx('readwrite', (s) => s.put(i));
export const drop = (id: string): Promise<unknown> => tx('readwrite', (s) => s.delete(id));
export async function all(): Promise<Item[]> {
  try { const xs = await tx<Item[]>('readonly', (s) => s.getAll() as IDBRequest<Item[]>); return xs.sort((a, b) => b.at - a.at); }
  catch { return []; }   // a browser with storage blocked: the page still opens and says it is empty
}
export const newId = (): string => `i${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** How many are waiting, for the badge on the front door. */
export async function waiting(): Promise<number> { return (await all()).filter((i) => !i.sent).length; }

// ---- getting a picture in ---------------------------------------------------------------------------------------

/** A picture of what you are looking at. The browser will not let a page photograph the screen by itself, so this
 *  asks — the person picks this tab and it takes ONE frame and stops the stream immediately. Where the browser
 *  refuses (an old one, a phone, a page not served over https) it throws and the caller offers the other two ways
 *  in: paste one, or pick a file. */
export async function grabScreen(): Promise<Blob> {
  const md = navigator.mediaDevices as MediaDevices & { getDisplayMedia?: (c: unknown) => Promise<MediaStream> };
  if (!md?.getDisplayMedia) throw new Error('this browser will not let a page take a picture of the screen — paste one instead (⌘/Ctrl-V), or pick a file');
  const stream = await md.getDisplayMedia({ video: { displaySurface: 'browser' }, audio: false });
  try {
    const track = stream.getVideoTracks()[0]!;
    const v = document.createElement('video');
    v.srcObject = stream; v.muted = true; await v.play();
    await new Promise((ok) => setTimeout(ok, 180));                 // one frame, once it is actually showing
    const c = document.createElement('canvas');
    c.width = v.videoWidth || track.getSettings().width || 1280;
    c.height = v.videoHeight || track.getSettings().height || 800;
    c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
    return await new Promise<Blob>((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error('the picture came out empty'))), 'image/png'));
  } finally { for (const t of stream.getTracks()) t.stop(); }
}

/** A picture out of a paste. Returns null where the paste held no image, which is the ordinary case for text. */
export function pastedImage(e: ClipboardEvent): Blob | null {
  for (const it of e.clipboardData?.items ?? []) if (it.type.startsWith('image/')) return it.getAsFile();
  return null;
}

/** Keep one, and say so. `from` is the page it was taken on. */
export async function keep(sort: Sort, png: Blob | undefined, ask: string, from?: string): Promise<Item> {
  const i: Item = { id: newId(), sort, at: Date.now(), ask, png, from };
  await put(i);
  return i;
}

// ---- the key, on every page -------------------------------------------------------------------------------------

/** THE ONE KEY. Press ⇧C anywhere in the app and what you are looking at goes into To Claude with a line about it.
 *  It is fitted on every 2D page by one call, so there is nowhere in the app where it does not work. */
export function wireCaptureKey(where: string): void {
  const toast = (text: string, good = true) => {
    const el = document.createElement('div');
    el.className = `toast ${good ? '' : 'bad'}`; el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => { el.classList.add('go'); setTimeout(() => el.remove(), 400); }, good ? 3200 : 5200);
  };
  const go = async () => {
    try {
      const png = await grabScreen();
      const ask = window.prompt('What do you want Claude to do with this?', '') ?? '';
      await keep('shot', png, ask, where);
      toast('kept in To Claude →');
    } catch (e) { toast((e as Error).message, false); }
  };
  window.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement | null;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;      // typing a capital C is not a command
    if (e.key === 'C' && e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); void go(); }
  });
  window.addEventListener('paste', (e) => {
    const png = pastedImage(e);
    if (!png) return;
    e.preventDefault();
    void keep('shot', png, window.prompt('Pasted. What do you want Claude to do with it?', '') ?? '', where)
      .then(() => toast('kept in To Claude →'));
  });
}
