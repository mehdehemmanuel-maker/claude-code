// Plain requests to Ada. "make it stronger", "weld these", "place 4 steel blocks", "save this as a template",
// "why did it break?". Each is read into an intent: what to do, to what, how many, with what. Ada then does it with
// the same engineering as everything else. A line that isn't a request is tried as Forge.

export type Intent =
  | { do: 'strengthen' }
  | { do: 'join'; joint: string; floor: boolean }
  | { do: 'place'; count: number; kind: string; material?: string }
  | { do: 'freeze' | 'unfreeze' | 'delete' | 'template' | 'status' | 'why' | 'help' }
  | { do: 'duplicate'; count: number }
  | { do: 'command'; command: 'play' | 'build' | 'undo' | 'redo' | 'save' | 'new' | 'pause' | 'switch on' | 'switch off' | 'gravity earth' | 'gravity moon' | 'gravity zero' };

const NUMBERS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, pair: 2, couple: 2 };

const JOINT_WORDS: Record<string, string> = {
  weld: 'weld', bolt: 'bolted', screw: 'screwed', glue: 'glued', rivet: 'riveted', nail: 'nailed', solder: 'soldered',
  join: 'best', attach: 'best', connect: 'best', fasten: 'best', fix: 'best', stick: 'best', lock: 'best',
};

const it = '(?:it|this|that|these|them|those|the (?:selection|assembly|thing))';

/** What a line asks for, or null if it isn't a request Ada knows (then it may be Forge). */
export function interpret(line: string): Intent | null {
  const t = line.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9%. ]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(ada|hey ada|please|can you|could you|would you)\s+/g, '').replace(/\s+please$/, '');
  if (!t) return null;
  let m: RegExpExecArray | null;
  if (/^(help|what can you do|commands)$/.test(t)) return { do: 'help' };
  if (/^(whats wrong|status|report|how is it|hows it (doing|going)|check (it|this|the build)|anything wrong)/.test(t)) return { do: 'status' };
  if (/^why( did (it|that|this) (break|fail|fall))?/.test(t)) return { do: 'why' };
  if (new RegExp(`^(make ${it} )?(stronger|sturdier|hold|stiffer)|^(fix|strengthen|reinforce) ${it}|^fix( it)?$|^make ${it} hold`).test(t)) return { do: 'strengthen' };
  if (new RegExp(`^save ${it} as (a )?template|^(make|save) (a )?template|^template ${it}`).test(t)) return { do: 'template' };
  if (new RegExp(`^(unfreeze|unpin|free|release) ${it}`).test(t)) return { do: 'unfreeze' };
  if (new RegExp(`^(freeze|pin|anchor) ${it}`).test(t)) return { do: 'freeze' };
  if (new RegExp(`^(delete|remove|trash|get rid of|scrap) ${it}`).test(t)) return { do: 'delete' };
  if ((m = new RegExp(`^(duplicate|copy|clone) ${it}(?: (\\w+) times)?`).exec(t))) return { do: 'duplicate', count: count(m[2]) ?? 1 };
  if ((m = new RegExp(`^(weld|bolt|screw|glue|rivet|nail|solder|join|attach|connect|fasten|stick|lock)(?: ${it})?(?: together)?( to (the )?(floor|ground))?$`).exec(t))) {
    return { do: 'join', joint: JOINT_WORDS[m[1]!]!, floor: !!m[2] };
  }
  const commands: [RegExp, Extract<Intent, { do: 'command' }>['command']][] = [
    [/^(play|go|run it|test it|start)$/, 'play'], [/^(stop|back to build|build mode|edit)$/, 'build'], [/^undo( that)?$/, 'undo'], [/^redo$/, 'redo'],
    [/^save( (the|my) build)?$/, 'save'], [/^(new build|start over|clear (it|everything))$/, 'new'], [/^(pause|freeze time)$/, 'pause'],
    [/^(switch|magnets?|power) on$/, 'switch on'], [/^(switch|magnets?|power) off$/, 'switch off'],
    [/^(earth|normal) gravity$|^gravity (earth|normal)$/, 'gravity earth'], [/^moon gravity$|^gravity moon$/, 'gravity moon'], [/^(zero|no) gravity$|^gravity (zero|off)$/, 'gravity zero'],
  ];
  for (const [re, command] of commands) if (re.test(t)) return { do: 'command', command };
  if ((m = /^(?:place|add|spawn|give me|put|make|build|drop)(?: me)? (?:(\w+) )?(.+?)(?: here| in front( of me)?)?$/.exec(t))) {
    const n = count(m[1]);
    const words = (n === null && m[1] ? `${m[1]} ${m[2]}` : m[2]!).split(' ').filter((w) => !['of', 'the', 'some'].includes(w));
    if (!words.length) return null;
    // "4 steel blocks", "an oak board": the last word is the part, what comes before it the material
    const kind = singular(words[words.length - 1]!);
    const material = words.length > 1 ? words.slice(0, -1).join(' ') : undefined;
    return { do: 'place', count: Math.min(n ?? 1, 50), kind, material };
  }
  return null;
}

/** blocks → block, boxes → box, batteries → battery; brass and glass stay. */
function singular(w: string) {
  if (/ies$/.test(w)) return w.replace(/ies$/, 'y');
  if (/(ss|us)$/.test(w)) return w;
  if (/(s|x|z|ch|sh)es$/.test(w)) return w.replace(/es$/, '');
  return w.replace(/s$/, '');
}

function count(w: string | undefined): number | null {
  if (!w) return null;
  if (/^\d+$/.test(w)) return Number(w);
  return NUMBERS[w] ?? null;
}

export const HELP = 'Try: "make it stronger", "weld these", "place 4 steel blocks", "save this as a template", "freeze it", "duplicate it 3 times", "why did it break?", "play". Or type Forge.';
