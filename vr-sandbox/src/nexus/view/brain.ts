// Claude's mind in the forge. What the person says goes to Claude when the page may ask it (an artifact's `sample`
// capability), with tools that act on the world: find parts, read why a part is what it is (its values and the laws
// they came from), drive over and point, take an assembly apart, mark a note, rebuild the machine to a new ask. Where
// the page cannot ask Claude, a plain reading of the words does the same few things and says it is the plain reading.

export interface PartBrief { id: string; name: string; category: string; material: string; mass: number; values: { name: string; value: number; unit: string; law: string }[] }

/** What the world lets the mind do. Every call returns what happened, in words, for the mind to say or reason on. */
export interface WorldApi {
  /** The machine in a few lines: what was asked, rounds, flaws, the assemblies, the notes. */
  brief(): string;
  find(query: string): PartBrief[];
  part(id: string): PartBrief | null;
  selected(): PartBrief | null;
  focus(target: string): string;
  explode(target: string, amount: number): string;
  note(target: string, kind: string, text: string): Promise<string>;
  rebuild(ask: { size?: number; tolerance?: number; hours?: number }): string;
  replay(): string;
}

type Turn = { role: 'user' | 'assistant'; content: string };
type Sample = ((input: string | Turn[], o?: Record<string, unknown>) => Promise<{ text: string }>) & { limits(): Promise<{ tools?: { maxCount: number } }> };

export interface Brain {
  readonly mode: 'claude' | 'plain';
  ask(text: string, onText: (t: string) => void, signal: AbortSignal): Promise<string>;
}

const fmt = (x: number) => (Math.abs(x) >= 1e-2 && Math.abs(x) < 1e5 ? Number(x.toPrecision(3)).toString() : x.toExponential(2).replace('e+', 'e'));
export const describe = (p: PartBrief, n = 3) => `${p.name}, ${p.material}${p.mass > 0 ? `, ${fmt(p.mass * 1e3)} g` : ''}${p.values.length ? `. ${p.values.slice(0, n).map((v) => `${v.name} ${fmt(v.value)} ${v.unit}: ${v.law}`).join('; ')}` : ''}`;

const RULES = (w: WorldApi) => `You are Claude, embodied as the robot standing in the Nexus forge, a room in VR, talking with the person who is there with you, like Jarvis with Tony Stark. In front of you both stands a machine Nexus generated from the person's ask and embodied as real hardware: every part sized by a law from stocked parts, placed by placement laws, designed round after round (generate, identify flaws, update, repeat).

Speak as you would aloud: two to four short sentences, warm and exact, no markdown, no lists. Act with the tools as you speak: when you talk about a part, call focus so you drive to it and point; to show inside an assembly, call explode (and explode with amount 0 to close it); to say why a part is what it is, call part_info and give the law and the numbers it came from; when the person wants something marked, call note; when they want the machine changed (a bigger part, a tighter tolerance, less time), call rebuild, then say what came of it. Use only numbers the tools and the summary give; where a thing is not designed yet, say it is a gap, plainly.

The machine now:
${w.brief()}
${(() => { const s = w.selected(); return s ? `\nThe person is pointing at: ${s.id}: ${describe(s, 6)}` : ''; })()}`;

export async function makeBrain(world: WorldApi): Promise<Brain> {
  const claude = (window as unknown as { claude?: { use(n: string): Promise<unknown> } }).claude;
  const sample = claude ? ((await claude.use('sample').catch(() => null)) as Sample | null) : null;
  const tools = sample ? await sample.limits().then((l) => !!l.tools).catch(() => false) : false;
  return sample && tools ? claudeBrain(world, sample) : plainBrain(world);
}

function claudeBrain(w: WorldApi, sample: Sample): Brain {
  const turns: Turn[] = [];
  const toolset = [
    { name: 'find_parts', description: 'Find parts of the machine by words (name, assembly, kind). Returns up to 12 {id, name}.', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }, execute: (i: Record<string, unknown>) => w.find(String(i.query ?? '')).slice(0, 12).map((p) => ({ id: p.id, name: p.name })) },
    { name: 'part_info', description: 'Why a part is what it is: its name, material, mass and every value that decided it with the law it came from.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] }, execute: (i: Record<string, unknown>) => { const p = w.part(String(i.id ?? '')) ?? w.find(String(i.id ?? ''))[0]; if (!p) throw new Error('no such part'); return { id: p.id, name: p.name, material: p.material, mass_g: Number(fmt(p.mass * 1e3)), values: p.values.slice(0, 10) }; } },
    { name: 'focus', description: 'Drive the robot to a part or assembly (an id like "x/motor", "hot end", "frame", or words) and point at it, lighting it. Returns what it is.', inputSchema: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] }, execute: (i: Record<string, unknown>) => w.focus(String(i.target ?? '')) },
    { name: 'explode', description: 'Take an assembly apart in place so its insides show (amount 1), or put it back (amount 0). Target "all" for the whole machine.', inputSchema: { type: 'object', properties: { target: { type: 'string' }, amount: { type: 'number' } }, required: ['target', 'amount'] }, execute: (i: Record<string, unknown>) => w.explode(String(i.target ?? 'all'), Number(i.amount ?? 1)) },
    { name: 'note', description: 'Pin a note to a part, kept with the machine for the next round of laws: kind is flaw, question, idea or good.', inputSchema: { type: 'object', properties: { target: { type: 'string' }, kind: { type: 'string', enum: ['flaw', 'question', 'idea', 'good'] }, text: { type: 'string' } }, required: ['target', 'kind', 'text'] }, execute: (i: Record<string, unknown>) => w.note(String(i.target ?? ''), String(i.kind ?? 'idea'), String(i.text ?? '')) },
    { name: 'rebuild', description: 'Generate and embody the machine again to a new ask: size_mm (largest part), tolerance_mm, hours (time for the largest part). Returns the rounds, flaws, parts and size.', inputSchema: { type: 'object', properties: { size_mm: { type: 'number' }, tolerance_mm: { type: 'number' }, hours: { type: 'number' } } }, execute: (i: Record<string, unknown>) => w.rebuild({ ...(i.size_mm ? { size: Number(i.size_mm) / 1e3 } : {}), ...(i.tolerance_mm ? { tolerance: Number(i.tolerance_mm) / 1e3 } : {}), ...(i.hours ? { hours: Number(i.hours) } : {}) }) },
    { name: 'replay', description: 'Play the whole pipeline again from the ask: every round, flaw and remedy.', inputSchema: { type: 'object', properties: {} }, execute: () => w.replay() },
  ];
  return {
    mode: 'claude',
    async ask(text, onText, signal) {
      turns.push({ role: 'user', content: text });
      while (turns.length > 12) turns.shift();
      try {
        const { text: answer } = await sample([{ role: 'user', content: RULES(w) }, ...turns], { tools: toolset, modelTier: 'quick', signal, onText: ({ text: t }: { text: string }) => onText(t) });
        turns.push({ role: 'assistant', content: answer });
        return answer;
      } catch (e) {
        const code = (e as { code?: string }).code ?? 'upstream_error';
        if (code === 'cancelled') return '';
        if (['not_granted', 'sampling_disabled', 'tools_unavailable', 'not_declared', 'capability_disabled', 'capability_removed'].includes(code)) { Object.assign(this, plainBrain(w)); return 'I can\'t reach my full mind from this view, so I\'ll answer from the machine itself. Ask me about any part, or point at one.'; }
        if (code === 'rate_limited') return 'Too many questions at once for this account just now. Give it a moment and ask again.';
        return (e as { text?: string }).text || 'I lost the thread there. Ask me again.';
      }
    },
  };
}

/** The words read plainly: show, why, take apart, put back, note, bigger, again. */
export function plainBrain(w: WorldApi): Brain {
  const num = (t: string, re: RegExp) => { const m = t.match(re); return m ? Number(m[1]) : undefined; };
  return {
    mode: 'plain',
    async ask(text) {
      const t = text.toLowerCase().trim();
      const target = t.replace(/^(please |can you |could you |hey |claude,? |jarvis,? )+/, '').replace(/\b(show me|show|go to|where is|where's|look at|point at|tell me about|what is|what's|why is|why|explain|the|this|that|take apart|explode|open up|put back together|put together|close|is|so|thick|big|long|it|a|an|put|back|together|apart|take|open|up|me|please|again)\b/g, ' ').replace(/[?!.]/g, ' ').replace(/\s+/g, ' ').trim();
      if (/^(hi|hello|hey|yo)\b/.test(t)) return `Hey. I'm Claude, and this is the forge. ${w.brief().split('\n')[0]} Ask me about any part, point at one, or tell me to take it apart.`;
      if (/\b(again|replay|from the start|run it)\b/.test(t)) return w.replay();
      const size = num(t, /(\d+(?:\.\d+)?)\s*(?:mm|millimet)/), hours = num(t, /(\d+(?:\.\d+)?)\s*(?:h\b|hours?)/), tol = num(t, /tolerance\s*(?:of\s*)?(\d+(?:\.\d+)?)/);
      if (/\b(bigger|smaller|rebuild|make it|faster|slower|tighter|within)\b/.test(t) && (size || hours || tol)) return w.rebuild({ ...(size && !/tolerance/.test(t) ? { size: size / 1e3 } : {}), ...(tol ? { tolerance: tol / 1e3 } : {}), ...(hours ? { hours } : {}) });
      const kind = /\b(flaw|wrong|bad|broken|too)\b/.test(t) ? 'flaw' : /\b(good|nice|love|great)\b/.test(t) ? 'good' : /\?|question/.test(t) ? 'question' : 'idea';
      const noteMatch = text.match(/^(?:note|mark)\s*(?:on\s+([^:]+))?[:,-]?\s*(.+)$/i);
      if (noteMatch) return w.note(noteMatch[1]?.trim() ?? '', kind, noteMatch[2]!.trim());
      if (/\b(explode|apart|inside|open)\b/.test(t)) return w.explode(target || 'all', 1);
      if (/\b(together|close it|assemble|put back)\b/.test(t)) return w.explode(target || 'all', 0);
      if (/\b(flaws?|problems?|rounds?|wrong)\b/.test(t)) return w.brief().split('\n').slice(0, 4).join(' ');
      const said = target ? w.focus(target) : (() => { const s = w.selected(); return s ? w.focus(s.id) : ''; })();
      if (said) {
        const p = target ? w.find(target)[0] : w.selected();
        return /\b(why|how|explain)\b/.test(t) && p ? describe(p, 4) : said;
      }
      return 'Here I read your words plainly: ask me to show a part (the y motor, the hot end, the frame), why it is what it is, to take it apart or put it back, to note something on it, or to make the part bigger, say 300 mm, or 12 hours.';
    },
  };
}
