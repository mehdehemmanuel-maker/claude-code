// Plain requests to Ego. "make it stronger", "weld these", "place 4 steel blocks", "save this as a template",
// "why did it break?". Each is read into an intent: what to do, to what, how many, with what. Ego then does it with
// the same engineering as everything else. A line that isn't a request is tried as Forge.

import { isComplaint } from './reports';
import type { Design, DesignSpec } from './designer';

export type Intent =
  | { do: 'strengthen' }
  | { do: 'join'; joint: string; floor: boolean }
  | { do: 'place'; count: number; kind: string; material?: string }
  | { do: 'freeze' | 'unfreeze' | 'delete' | 'template' | 'status' | 'why' | 'help' }
  | { do: 'duplicate'; count: number }
  | { do: 'skill'; which: string }
  | { do: 'complain'; words: string }
  | { do: 'design'; spec: DesignSpec; material?: string }
  | { do: 'level' }
  | { do: 'command'; command: 'play' | 'build' | 'undo' | 'redo' | 'save' | 'new' | 'pause' | 'switch on' | 'switch off' | 'gravity earth' | 'gravity moon' | 'gravity zero' };

const NUMBERS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, pair: 2, couple: 2 };

const JOINT_WORDS: Record<string, string> = {
  weld: 'weld', bolt: 'bolted', screw: 'screwed', glue: 'glued', rivet: 'riveted', nail: 'nailed', solder: 'soldered',
  join: 'best', attach: 'best', connect: 'best', fasten: 'best', fix: 'best', stick: 'best', lock: 'best',
};

const it = '(?:it|this|that|these|them|those|the (?:selection|assembly|thing))';

/** What a line asks for, or null if it isn't a request Ego knows (then it may be Forge). */
export function interpret(line: string): Intent | null {
  const t = line.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9%. ]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(ego|hey ego|please|can you|could you|would you)\s+/g, '').replace(/\s+please$/, '');
  if (!t) return null;
  let m: RegExpExecArray | null;
  if (/^(help|what can you do|commands)$/.test(t)) return { do: 'help' };
  if (/^(what level are you|your level|level|how (much )?have you grown|how smart are you)/.test(t)) return { do: 'level' };
  if ((m = /^(?:do|run|use)(?: (?:the|your|my))? skill (.+)$|^skill (.+)$|^do (?:the )?(.+?) (?:skill|thing)$/.exec(t))) return { do: 'skill', which: (m[1] ?? m[2] ?? m[3])!.trim() };
  if (/^(whats wrong|status|report|how is it|hows it (doing|going)|check (it|this|the build)|anything wrong)/.test(t)) return { do: 'status' };
  if (/^why( did (it|that|this) (break|fail|fall))?/.test(t)) return { do: 'why' };
  if (new RegExp(`^(make ${it} )?(stronger|sturdier|hold|stiffer)|^(fix|strengthen|reinforce) ${it}|^fix( it)?$|^make ${it} hold`).test(t)) return { do: 'strengthen' };
  // something's wrong: she looks, fixes what she can, and writes it up for Claude
  if (isComplaint(t)) return { do: 'complain', words: line.trim() };
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
  const d = designOf(t);
  if (d) return d;
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

const DESIGNS: [RegExp, Design][] = [
  [/\b(table|desk|workbench)\b/, 'table'], [/\bbench\b/, 'bench'], [/\b(crate|box|chest)\b/, 'crate'],
  [/\b(shelf|shelves|shelving|bookshelf|bookcase)\b/, 'shelf'], [/\b(brick wall|wall)\b/, 'wall'], [/\b(tower|stack|column|pillar)\b/, 'tower'],
];
const LENGTH: Record<string, number> = { mm: 0.001, cm: 0.01, m: 1, meter: 1, meters: 1, metre: 1, metres: 1, in: 0.0254, inch: 0.0254, inches: 0.0254, ft: 0.3048, foot: 0.3048, feet: 0.3048 };

/** "build a table that holds 80 kg, 90 cm tall, out of oak": what to design, how big, for what, in what. */
function designOf(t: string): Extract<Intent, { do: 'design' }> | null {
  if (!/^(build|design|make|create|construct|give me|i want|i need)\b/.test(t)) return null;
  const hit = DESIGNS.find(([re]) => re.test(t));
  if (!hit) return null;
  const spec: DesignSpec = { what: hit[1] };
  let m: RegExpExecArray | null;
  const dims = /(\d+(?:\.\d+)?)\s*(mm|cm|m|meters?|metres?|in|inch(?:es)?|ft|foot|feet)\s*(tall|high|wide|long|deep)/g;
  while ((m = dims.exec(t))) {
    const v = Number(m[1]) * (LENGTH[m[2]!] ?? 1);
    if (m[3] === 'tall' || m[3] === 'high') spec.height = v;
    else if (m[3] === 'deep') spec.depth = v;
    else spec.width = v;
  }
  if ((m = /(\d+(?:\.\d+)?)\s*(kg|kilos?|kilograms?|lbs?|pounds?)/.exec(t))) spec.load = Number(m[1]) * (/^(lb|pound)/.test(m[2]!) ? 0.4536 : 1);
  if ((m = /(\d+|two|three|four|five|six|seven|eight|ten|twelve|twenty)\s*(shelves|courses|rows|blocks|bricks|levels|high|tall)/.exec(t))) spec.count = count(m[1]) ?? undefined;
  let material: string | undefined;
  if ((m = /\b(?:out of|made of|made from|from|in)\s+([a-z][a-z-]*(?: [a-z][a-z-]*)?)/.exec(t))) material = m[1]!.replace(/\s+(that|which|with|for|and)\b.*$/, '').trim();
  else if ((m = /\b(?:a|an)\s+([a-z-]+)\s+(?:table|desk|workbench|bench|crate|box|chest|shelf|bookshelf|bookcase|wall|tower|stack)\b/.exec(t)) && !/^(big|small|little|large|tall|short|long|wide|strong|sturdy|simple|nice|good|new)$/.test(m[1]!)) material = m[1];
  return { do: 'design', spec, material };
}

function count(w: string | undefined): number | null {
  if (!w) return null;
  if (/^\d+$/.test(w)) return Number(w);
  return NUMBERS[w] ?? null;
}

export const HELP = 'Try: "make it stronger", "weld these", "place 4 steel blocks", "build a table that holds 60 kg", "build a brick wall 2 m long", "save this as a template", "freeze it", "duplicate it 3 times", "why did it break?", "do skill 1", "what level are you?", "play". Or type Forge.';
