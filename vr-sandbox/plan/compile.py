#!/usr/bin/env python3
"""Compile the plan folder into one index (plan/INDEX.md), from the files themselves: never edit INDEX.md by hand.

Reads: specs/*/tasks.json and specs/*/spec.md task tables, CONSTITUTION.md, QUESTIONS.md, DEFECTS.md,
research/*.md (marks, questions, branches), research/00-synthesis.md (findings), research/TREE.md (branches by trunk),
BOOK-OF-QUESTIONS.md (questions by chapter). Also checks the plan for problems: task ids repeated within a spec, a task
waiting on one that does not exist, a finding with no theme, a defect with no task. Run: python3 plan/compile.py
(exit code 1 when a problem is found).
"""
import json, re, sys
from pathlib import Path

PLAN = Path(__file__).resolve().parent
problems: list[str] = []

# Task states the tables cannot carry (a spec.md table has no status column): what is done, said here with its date.
# (the builder's word only: "claimed" until the evaluator's verdict (specs/00-structure/evaluator.md) says pass)
STATE = {
    '10.T1': 'claimed, in part: values done 2026-10-31 (CODATA 2022); correlations not yet',
    '10.T11': 'claimed 2026-11-01: kinds on wires (rpm/Hz, J/N m, Gy/Sv, dB, ΔK); a law\'s dimensionless input takes only a number (fault D1 closed)',
    '11.LW12': 'claimed, in part, 2026-11-01: early cutoff counted in the gate; effects scanned only in each block\'s own run',
    '04.P10': 'claimed 2026-11-01: every target a hand presses in the headset measured in an emulated Quest 3 (`npm run eval:headset`), blocks only on the board, wires made from the side panel; no real Quest yet (spec 03, W5)',
    '10.T23': 'claimed, in part, 2026-11-01: the envelope and the kinds dims, witness and judged, exact and closed, with a second checker in Python (decision 0013); the other ten kinds not built',
    '10.T18': 'claimed, in part, 2026-11-01: the AI\'s board taken only when the kernel, run again in the page, refuses none of its certificates (law nodes at the point they ran, wires\' units); blocks folded and parts placed carry none yet',
    '10.T24': 'claimed, in part, 2026-11-01: no piece excused by its name, no depth skipped; the gate\'s own builds clean (the engine\'s rod bolts given holes); the Cascadia and the Rancher show the clashes it hid (fault D14)',
    '10.T3': 'claimed 2026-11-01: every figure in src/data carries a claim status from the evidence vocabulary; the gate refuses one without',
    '11.LW15': 'claimed 2026-11-01: the gate compares each quick board cached, again and fresh; a planted cache fault fails it',
}

# The synthesis's findings by theme (each finding number in exactly one theme).
THEMES = {
    'Units, quantities and kinds': [11, 20, 31],
    'The engine: incremental, lazy, replay': [6, 7, 32, 42],
    'Trust: checks, certificates, the kernel': [3, 15, 33, 34, 40, 41],
    'Trust: values, sources and claims': [4, 5, 14, 21, 25, 26, 27, 36],
    'The AI in the app: judges, prompts, notation': [9, 10, 16, 35, 38, 39],
    'Interfaces, parts and making': [12, 13, 19, 45],
    'Physics core': [1, 2, 22, 28],
    'Living world, growth and space': [8, 29, 30, 43],
    'People: bodies, comfort, the view': [18, 44],
    'Cost and carbon': [37],
    'How Nexus is built and learns': [17, 23, 24],
}

def cells(line: str) -> list[str]:
    return [c.strip() for c in line.strip().strip('|').split('|')]

def spec_tasks() -> list[dict]:
    out = []
    for d in sorted((PLAN / 'specs').iterdir()):
        if not d.is_dir():
            continue
        spec = d.name[:2]
        tj = d / 'tasks.json'
        if tj.exists():
            for t in json.loads(tj.read_text())['tasks']:
                out.append({'spec': spec, 'dir': d.name, 'id': t['id'], 'title': t['title'], 'check': t.get('check', ''),
                            'after': t.get('after', []), 'status': t.get('status', 'failing')})
        sm = d / 'spec.md'
        if sm.exists():
            rows, on = [], False
            for line in sm.read_text().split('\n'):
                if line.startswith('## '):
                    on = line.strip() == '## Tasks'
                elif on and re.match(r'^\| [A-Z]+\d+ \|', line):
                    c = cells(line)
                    if len(c) >= 4:
                        after = [a.strip() for a in c[3].replace('—', '').split(',') if a.strip()]
                        rows.append({'spec': spec, 'dir': d.name, 'id': c[0], 'title': c[1], 'check': c[2], 'after': after, 'status': 'failing'})
            out += rows
    for t in out:
        t['key'] = f"{t['spec']}.{t['id']}"
        if t['key'] in STATE:
            t['status'] = STATE[t['key']]
    # (only the evaluator passes a task: its verdict file, a pass, overrides the builder's word; a builder's "passing"
    # without one is a plan problem)
    vd = PLAN / 'specs/00-structure/verdicts'
    for t in out:
        f = vd / f"{t['key']}.json"
        if f.exists():
            v = json.loads(f.read_text())
            t['status'] = f"passing (evaluator {v.get('model', '?')}, {v.get('date', '?')})" if v.get('verdict') == 'pass' else f"failing (evaluator: {'; '.join(v.get('missing', []))[:120]})"
        elif t['status'].startswith('passing'):
            problems.append(f"{t['key']} says passing with no evaluator's verdict")
    return out

def check_tasks(tasks: list[dict]) -> None:
    seen: dict[str, int] = {}
    for t in tasks:
        seen[t['key']] = seen.get(t['key'], 0) + 1
    for k, n in seen.items():
        if n > 1:
            problems.append(f'task id {k} appears {n} times')
    keys = set(seen)
    for t in tasks:
        for a in t['after']:
            m = re.match(r'^(?:(\d\d)\s+)?([A-Z]+\d+)$', a)
            if not m:
                continue  # "00", "research 11", "spec 04 P4" and such: a phase or a note, not a task id
            ref = f"{m.group(1) or t['spec']}.{m.group(2)}"
            if ref not in keys:
                problems.append(f"{t['key']} waits on {a}, which is not a task")

def rules() -> list[list[str]]:
    return [cells(l) for l in (PLAN / 'CONSTITUTION.md').read_text().split('\n') if re.match(r'^\| C\d+ \|', l)]

def user_questions() -> list[tuple[str, str, bool]]:
    """(id, question, unanswered) from the For-the-user table: unanswered while its Answer cell is empty or a dash."""
    out = []
    for l in (PLAN / 'QUESTIONS.md').read_text().split('\n'):
        if re.match(r'^\| U\d+ \|', l):
            c = cells(l)
            out.append((c[0], c[1], c[-1] in ('', '—', '-') or 'asked again' in c[-1]))
    return out

def research_passes(findings: list[tuple[int, str, str]]) -> list[dict]:
    out = []
    for f in sorted((PLAN / 'research').glob('[0-9][0-9]-*.md')):
        n = int(f.name[:2])
        if n == 0:
            continue
        s = f.read_text()
        title = re.sub(r'^#\s*(Research( \(round \d+\))?:?\s*)?', '', s.split('\n', 1)[0]).strip()
        title = re.sub(r'^\(round \d+[^)]*\):\s*', '', title)
        title = title[:1].upper() + title[1:]
        rnd = 1 if n <= 5 else 2 if n <= 11 else 3 if n <= 17 else 4 + (n - 18) // 6
        sec = lambda h: (re.search(rf'^## \({h}\).*?(?=^## \(|\Z)', s, re.S | re.M) or [''])[0]
        q, b = sec('C'), sec('D')
        out.append({'n': n, 'file': f.name, 'title': title, 'round': rnd,
                    'C': s.count('[C]'), 'M': s.count('[M]'), 'I': s.count('[I]'),
                    'questions': len(re.findall(r'^\d+\. ', q, re.M)), 'branches': len(re.findall(r'^- ', b, re.M)),
                    'findings': [str(k) for k, _, p in findings if re.search(rf'(?<!\d){n:02d}(?!\d)', p)]})
    return out

def synthesis() -> list[tuple[int, str, str]]:
    out = []
    for l in (PLAN / 'research/00-synthesis.md').read_text().split('\n'):
        m = re.match(r'^\| (\d+) \| \*\*(.+?)\*\*', l)
        if m:
            c = cells(l)
            out.append((int(m.group(1)), m.group(2).rstrip(':').strip(), c[2] if len(c) > 2 else ''))
    nums = {k for k, _, _ in out}
    themed = [x for v in THEMES.values() for x in v]
    for k in sorted(nums - set(themed)):
        problems.append(f'finding {k} has no theme in compile.py THEMES')
    for k in sorted({x for x in themed if themed.count(x) > 1}):
        problems.append(f'finding {k} is in more than one theme')
    return out

def tree() -> list[tuple[str, int, int, int]]:
    out, trunk, c = [], None, [0, 0, 0]
    for l in (PLAN / 'research/TREE.md').read_text().split('\n'):
        if l.startswith('### ') or l.startswith('## Rounds'):
            if trunk:
                out.append((trunk, *c))
            trunk, c = (l[4:].strip() if l.startswith('### ') else None), [0, 0, 0]
        elif trunk:
            if l.startswith('- [x]'): c[0] += 1
            elif l.startswith('- [ ]'): c[1] += 1
            elif l.startswith('- [~]'): c[2] += 1
    return [t for t in out if sum(t[1:])]

def book() -> list[tuple[str, int]]:
    """Questions per section of the book (each '## ' heading)."""
    out, ch, n = [], None, 0
    for l in (PLAN / 'BOOK-OF-QUESTIONS.md').read_text().split('\n'):
        if l.startswith('## '):
            if ch: out.append((ch, n))
            ch, n = l[3:].strip(), 0
        elif ch and re.match(r'^\d+\. ', l):
            n += 1
    if ch: out.append((ch, n))
    return out

def queue(tasks: list[dict]) -> list[str]:
    """The start queue from README.md: task keys in order; each must exist and follow the tasks it waits on."""
    r = (PLAN / 'README.md').read_text()
    m = re.search(r'^## The start queue.*?(?=^## )', r, re.S | re.M)
    keys = re.findall(r'^\d+\. `(\d\d\.[A-Z]+\d+)`', m.group(0), re.M) if m else []
    by = {t['key']: t for t in tasks}
    for i, k in enumerate(keys):
        if k not in by: problems.append(f'start queue names {k}, which is not a task'); continue
        for a in by[k]['after']:
            mm = re.match(r'^(?:(\d\d)\s+)?([A-Z]+\d+)$', a)
            if mm:
                dep = f"{mm.group(1) or by[k]['spec']}.{mm.group(2)}"
                if dep in keys[i:] or (dep not in keys and by.get(dep, {}).get('status', 'failing') == 'failing'):
                    problems.append(f'start queue: {k} waits on {dep}, which does not come before it')
    return keys

def table_rows(name: str) -> list[list[str]]:
    p = PLAN / name
    # (every line that starts a table row is read, however it is spaced: a row written '|A2|…' was skipped in silence, so an
    # open andon written so stopped nothing (the evaluator, 2026-11-01))
    return [cells(l) for l in p.read_text().split('\n') if l.startswith('|') and not re.match(r'^\|\s*(Id|Date)\s*\|', l) and not re.match(r'^\|\s*:?-', l)] if p.exists() else []

def defects() -> list[list[str]]:
    p = PLAN / 'DEFECTS.md'
    return [cells(l) for l in p.read_text().split('\n') if re.match(r'^\| D\d+ \|', l)] if p.exists() else []

def main() -> None:
    tasks = spec_tasks(); check_tasks(tasks)
    rs, qs, fs, ds = rules(), user_questions(), synthesis(), defects()
    rp, tr, bk = research_passes(fs), tree(), book()
    keys = {t['key'] for t in tasks}
    for d in ds:
        for k in re.findall(r'\b(\d\d\.[A-Z]+\d+)\b', d[-1]):
            if k not in keys: problems.append(f'defect {d[0]} names task {k}, which does not exist')
    unenf = [r for r in rs if 'unenforced' in r[-1].lower()]
    open_q = [q for q in qs if q[2]]
    L = []
    w = L.append
    w('# The plan, compiled')
    w('')
    w('Generated by `python3 plan/compile.py` from the plan\'s own files; do not edit by hand. Where each thing lives:')
    w('`README.md` (the vision, phases, how to work), `specs/` (tasks), `CONSTITUTION.md` (rules), `DEFECTS.md` (faults')
    w('found in the code), `QUESTIONS.md` (what only the user decides), `research/` (the passes, `00-synthesis.md`,')
    w('`TREE.md`), `BOOK-OF-QUESTIONS.md`.')
    w('')
    w('## At a glance')
    w('')
    w('| What | Count |')
    w('| --- | --- |')
    w(f'| Tasks in the specs | {len(tasks)}: {sum(1 for t in tasks if t["status"].startswith("passing"))} passing (by the evaluator), {sum(1 for t in tasks if t["status"].startswith("claimed"))} claimed by the builder and not yet judged, the rest failing |')
    w(f'| Faults found in the code | {len(ds)} ({sum(1 for d in ds if d[3].lower().startswith("fixed"))} fixed) |')
    w(f'| Rules in the constitution | {len(rs)} ({len(unenf)} not yet enforced by a check) |')
    w(f'| Questions for the user | {len(qs)} ({len(open_q)} unanswered: {", ".join(q[0] for q in open_q)}) |')
    w(f'| Research passes | {len(rp)} in {max(p["round"] for p in rp)} rounds |')
    w(f'| Findings in the synthesis | {len(fs)} |')
    w(f'| Research branches | {sum(t[1] for t in tr)} explored, {sum(t[2] for t in tr)} open, {sum(t[3] for t in tr)} touched |')
    w(f'| Questions in the book | {sum(n for _, n in bk)} in {len(bk)} sections (the best of 2,244; decision 0010) |')
    andons = table_rows('ANDON.md'); misses = table_rows('NEAR-MISS.md')
    open_andons = [r for r in andons if not r[4].startswith('closed')]
    # (the line stopped downstream too: every task that waits on the andon's task, through the whole chain of "after"
    # (the evaluator found only the task itself refused here, 2026-11-01); a closed andon names the commit that fixed it)
    by_key = {t['key']: t for t in tasks}
    # ("after" in every way the specs write it: "S3", "02 N3", "spec 04 P4", "V3 to V6", a whole spec ("spec 03", "01 (…)"))
    def deps(t: dict) -> list[str]:
        out = []
        for a in t['after']:
            y = re.sub(r'^spec\s+', '', a.strip())
            if (m := re.match(r'^(\d\d)\s+([A-Z]+\d+)$', y)): out.append(f'{m.group(1)}.{m.group(2)}')
            elif (m := re.match(r'^([A-Z]+)(\d+) to (?:[A-Z]+)?(\d+)$', y)): out += [f"{t['spec']}.{m.group(1)}{i}" for i in range(int(m.group(2)), int(m.group(3)) + 1)]
            elif (m := re.match(r'^(\d\d)\b(\s*\(.*\))?$', y)): out += [k for k in by_key if k.startswith(m.group(1) + '.')]
            elif re.match(r'^[A-Z]+\d+$', y): out.append(f"{t['spec']}.{y}")
        return out
    for r in open_andons:
        down, todo = set(), [r[2]]
        while todo:
            x = todo.pop()
            for t in tasks:
                if x in deps(t) and t['key'] not in down: down.add(t['key']); todo.append(t['key'])
        for k in [r[2]] + sorted(down):
            if by_key.get(k, {}).get('status', '').startswith('passing'): problems.append(f"{k} is passing with andon {r[0]} open (on {r[2]}{'' if k == r[2] else ', which it waits on'})")
    import subprocess
    for r in andons:
        if r[2] not in by_key: problems.append(f"andon {r[0]} names {r[2]}, which is not a task")
        m = re.match(r'^closed \d{4}-\d\d-\d\d by commit ([0-9a-f]{7,40})\b', r[4])
        if r[4].startswith('closed') and not m: problems.append(f"andon {r[0]} is closed without naming the commit that fixed it")
        # (the commit must exist, where the history is deep enough to hold it (a clone of one commit cannot say))
        elif m and subprocess.run(['git', 'rev-parse', '-q', '--verify', 'HEAD~3^{commit}'], cwd=PLAN, capture_output=True).returncode == 0 \
                and subprocess.run(['git', 'cat-file', '-e', m.group(1) + '^{commit}'], cwd=PLAN, capture_output=True).returncode != 0:
            problems.append(f"andon {r[0]} is closed by {m.group(1)}, which is not a commit")
    w(f'| Andons (stop the line) | {len(open_andons)} open, {len(andons) - len(open_andons)} closed |')
    w(f'| Near misses logged | {len(misses)} ({", ".join(f"{sum(1 for r in misses if r[2] == k)} {k}" for k in ("error", "at-risk", "reckless"))}) |')
    w(f'| Plan problems found by this script | {len(problems)} |')
    w('')
    w('## The start queue (from `README.md`)')
    w('')
    by = {t['key']: t for t in tasks}
    for i, k in enumerate(queue(tasks), 1):
        t = by.get(k)
        # (each with its state, so the handoff in PROGRESS.md can be checked against the queue (the evaluator, S2))
        st = t['status'] if t else ''
        label = ('passing' if st.startswith('passing') else 'failing, by the evaluator' if st.startswith('failing (evaluator') else
                 'claimed in part' if re.match(r'claimed,? in part', st) else 'claimed' if st.startswith('claimed') else 'failing')
        if t: w(f"{i}. **{k}** [{label}] {re.sub(r'[*`]', '', t['title'])[:140]}")
    w('')
    w('## Waiting on the user')
    w('')
    for q in open_q: w(f'- **{q[0]}** {q[1]}')
    w('')
    w('## Faults found in the code (from `DEFECTS.md`)')
    w('')
    w('| Id | Fault | Where | State | Task |')
    w('| --- | --- | --- | --- | --- |')
    for d in ds: w('| ' + ' | '.join(d[:5]) + ' |')
    w('')
    w('## Findings by theme (numbers are rows of `research/00-synthesis.md`)')
    w('')
    title = {k: t for k, t, _ in fs}
    for th, ns in THEMES.items():
        w(f'- **{th}**: ' + '; '.join(f'{k} {title.get(k, "?")}' for k in ns))
    w('')
    w('## Every task, by spec')
    w('')
    for spec in sorted({t['dir'] for t in tasks}):
        ts = [t for t in tasks if t['dir'] == spec]
        w(f'### {spec} ({len(ts)})')
        w('')
        w('| Id | Task | After | State |')
        w('| --- | --- | --- | --- |')
        for t in ts:
            short = re.sub(r'\s+', ' ', t['title'])
            short = short if len(short) <= 150 else short[:147].rsplit(' ', 1)[0] + ' …'
            w(f"| {t['id']} | {short.replace('|', '/')} | {', '.join(t['after']) or '—'} | {t['status']} |")
        w('')
    w('## Rules not yet enforced')
    w('')
    for r in unenf: w(f'- **{r[0]}** {r[1]} ({r[-1].replace("**", "")})')
    w('')
    w('## Research passes')
    w('')
    w('Marks are counted in each file: [C] checked in that pass with its source, [M] from memory, [I] inferred (the first')
    w('rounds wrote sources inline instead). Each pass\'s questions moved to the book; its new branches are in the tree.')
    w('')
    w('| # | Pass | Round | Marks C / M / I | Branches it opened | Findings it fed |')
    w('| --- | --- | --- | --- | --- | --- |')
    for p in rp:
        w(f"| {p['n']:02d} | [{p['title']}](research/{p['file']}) | {p['round']} | {(f"{p['C']} / {p['M']} / {p['I']}" if p['C'] + p['M'] + p['I'] else 'inline')} | {p['branches'] or '—'} | {', '.join(p['findings']) or '—'} |")
    w('')
    w('## The research tree by trunk')
    w('')
    w('| Trunk | Explored | Open | Touched |')
    w('| --- | --- | --- | --- |')
    for t in tr: w(f'| {t[0]} | {t[1]} | {t[2]} | {t[3]} |')
    w('')
    w('## The book of questions by section')
    w('')
    for ch, n in bk: w(f'- {ch}: {n}')
    w('')
    w('## Plan problems found')
    w('')
    w('\n'.join(f'- {p}' for p in problems) if problems else 'None.')
    index = '\n'.join(L) + '\n'
    # the book's contents, from its chapters
    bp = PLAN / 'BOOK-OF-QUESTIONS.md'; bs = bp.read_text()
    rows = '\n'.join(['| Section | Questions |', '| --- | --- |'] + [f'| {ch} | {n} |' for ch, n in bk])
    bs = re.sub(r'(<!-- contents: written by plan/compile.py -->\n).*?(<!-- /contents -->)', lambda m: m.group(1) + rows + '\n' + m.group(2), bs, flags=re.S)
    # (--check: write nothing; fail when INDEX.md or the book's contents are not what the plan compiles to now (the gate
    # runs it, so a state read from INDEX.md is the plan's own))
    if '--check' in sys.argv:
        stale = [n for n, now, f in (('INDEX.md', index, PLAN / 'INDEX.md'), ('BOOK-OF-QUESTIONS.md', bs, bp)) if f.read_text() != now]
        for n in stale: print(f'{n} is not what the plan compiles to: run python3 plan/compile.py')
        for p in problems: print(' -', p)
        sys.exit(1 if stale or problems else 0)
    (PLAN / 'INDEX.md').write_text(index)
    bp.write_text(bs)
    print(f'INDEX.md written: {len(tasks)} tasks, {len(ds)} faults, {len(rp)} passes, {len(problems)} problems')
    for p in problems: print(' -', p)
    sys.exit(1 if problems else 0)

if __name__ == '__main__':
    main()
