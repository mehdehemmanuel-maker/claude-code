// Complaints, and the reports they become. You tell Ego what's wrong in your own words while you play. She notes what
// she saw at that moment (the watchdog's findings, recent failures, what you held, the frame rate), fixes what she can
// herself, and keeps a report for Claude: the words, what she saw, what she did, the version, and the build as it was
// (its share code). Reports stay on the headset until sent, as a GitHub issue Claude reads, or copied.

export type Trouble = 'jitter' | 'fell-through' | 'flung' | 'broke' | 'slow' | 'stuck' | 'save' | 'unrealistic' | 'other';

const TROUBLES: [Trouble, RegExp][] = [
  ['fell-through', /(fell|fall|falls|sank|sinks|went|goes|sunk|clip\w*) (through|into|under) (the )?(floor|ground|table)|through the (floor|ground)|clipp?ing|passed through|went through/],
  ['flung', /(flew|flying|flies|exploded|explode|launch\w*|flung|yeet\w*|shot off|blew up|went flying|spazz\w*|rocket\w*)/],
  ['jitter', /(shak\w*|jitter\w*|vibrat\w*|buzz\w*|twitch\w*|wobbl\w*|trembl\w*|shiver\w*|won'?t (stay|sit) still|glitch\w*)/],
  ['broke', /(broke|broken|snapped|fell apart|came apart|came off|fell off|won'?t hold|doesn'?t hold|not holding|let go)/],
  ['slow', /(lag\w*|slow|stutter\w*|choppy|fps|frame ?rate|freez\w* up|hitch\w*)/],
  ['stuck', /(stuck|won'?t move|can'?t (grab|move|pick)|not moving|won'?t let go)/],
  ['save', /((won'?t|can'?t|couldn'?t|doesn'?t|didn'?t|not|isn'?t) (save|saving|keep|be saved)|save (failed|didn'?t|won'?t|is gone)|lost (my|the) (build|save|template)|(build|template) (is )?gone)/],
  ['unrealistic', /(not realistic|unrealistic|shouldn'?t|wouldn'?t (happen|work)|isn'?t real|not real|fake|impossible|makes no sense|wrong physics|physics (is|are) wrong)/],
];

/** What kind of trouble your words describe. */
export function troubleOf(words: string): Trouble {
  const t = words.toLowerCase();
  for (const [k, re] of TROUBLES) if (re.test(t)) return k;
  return 'other';
}

/** Words that are a complaint rather than a request. */
export function isComplaint(words: string) {
  const t = words.toLowerCase();
  return /^(report|bug|complain\w*|problem|issue)\b/.test(t) || /(broken|bug|wrong|weird|glitch|annoying|sucks|doesn'?t work|not work\w*|isn'?t working)/.test(t) || troubleOf(t) !== 'other';
}

export interface Report {
  id: string;
  at: string;
  words: string;
  trouble: Trouble;
  /** What Ego saw at that moment. */
  seen: string[];
  /** What she did about it herself, if anything. */
  fixed: string | null;
  version: string;
  /** The physics the run was under (vite.config.ts): evidence against an obligation is evidence about that physics only. */
  physics?: string;
  build: string;
  shareCode: string;
  sent: boolean;
}

const KEY = 'vrsb.reports';
const MAX = 30;

export class ReportBook {
  reports: Report[] = [];

  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'> | null = globalThis.localStorage ?? null) {
    try {
      const raw = this.storage?.getItem(KEY);
      const list = raw ? (JSON.parse(raw) as Report[]) : [];
      if (Array.isArray(list)) this.reports = list.filter((r) => r && typeof r.id === 'string');
    } catch { /* start fresh */ }
  }

  get unsent() {
    return this.reports.filter((r) => !r.sent);
  }

  add(r: Omit<Report, 'id' | 'sent'>): Report {
    const report: Report = { ...r, id: `r${Date.now().toString(36)}${this.reports.length}`, sent: false };
    this.reports = [...this.reports, report].slice(-MAX);
    this.save();
    return report;
  }

  markSent(ids: string[]) {
    for (const r of this.reports) if (ids.includes(r.id)) r.sent = true;
    this.save();
  }

  clear() {
    this.reports = [];
    this.save();
  }

  private save() {
    try { this.storage?.setItem(KEY, JSON.stringify(this.reports)); } catch { /* not kept */ }
  }
}

/** A report as Markdown, for a GitHub issue or the clipboard. */
export function reportText(reports: Report[], withCode = true): string {
  const out: string[] = [];
  for (const r of reports) {
    out.push(`### “${r.words}”`, '');
    out.push(`- **Trouble:** ${r.trouble}`, `- **When:** ${r.at} · version ${r.version} · build “${r.build}”`);
    if (r.fixed) out.push(`- **Ego fixed:** ${r.fixed}`);
    out.push('- **Ego saw:**', ...(r.seen.length ? r.seen.map((x) => `  - ${x}`) : ['  - nothing out of the ordinary']));
    if (withCode && r.shareCode) out.push('', '<details><summary>Build at that moment (share code: open it in the app)</summary>', '', '```', r.shareCode, '```', '</details>');
    out.push('');
  }
  return out.join('\n');
}

/** A new-issue link on GitHub, filled in; the build codes are left out when they would make it too long to open. */
export function issueUrl(reports: Report[], repo: string, limit = 7500): string {
  const title = reports.length === 1 ? `Ego report: ${reports[0]!.trouble} — “${reports[0]!.words.slice(0, 60)}”` : `Ego reports: ${reports.length} from the headset`;
  const make = (withCode: boolean) => `https://github.com/${repo}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(`Reported from the headset by Ego.\n\n${reportText(reports, withCode)}`)}`;
  const full = make(true);
  return full.length <= limit ? full : make(false);
}
