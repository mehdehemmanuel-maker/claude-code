import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PY_PRELUDE, TARGETS, readPy, runMeca } from '../../src/nexus/codesim';
import { component } from '../../src/nexus/components';

const py = (() => { try { execFileSync('python3', ['-c', 'pass']); return true; } catch { return false; } })();
const dir = mkdtempSync(join(tmpdir(), 'codesim-'));
/** A program run as the forge runs it (its prelude, then it), under this machine's own Python. */
const runPy = (code: string) => { writeFileSync(join(dir, 'user.py'), code); writeFileSync(join(dir, 'prog.py'), `input = open(${JSON.stringify(join(dir, 'user.py'))}).read()\n${PY_PRELUDE}\nprint(result)`); return readPy(execFileSync('python3', ['-I', join(dir, 'prog.py')]).toString().trim()); };

describe('the computer in the room', () => {
  it('gives every target a board the library draws, examples, and the steps to do it for real', () => {
    for (const t of TARGETS) {
      const c = component(t.board); expect(typeof c, `${t.id}: ${t.board}`).not.toBe('string');
      expect(t.examples.length, t.id).toBeGreaterThan(0); expect(t.real.length, t.id).toBeGreaterThan(2);
    }
  });
  it.skipIf(!py)('runs every Python example against its board\'s libraries, in its own time', () => {
    for (const t of TARGETS.filter((x) => x.runner === 'py-sim')) for (const ex of t.examples) {
      const r = runPy(ex.code); expect(r.end, `${t.id} · ${ex.title}: ${r.out.join(' / ')}`).not.toBe('error');
      expect(r.pins.size + r.meca.length, `${t.id} · ${ex.title}`).toBeGreaterThan(0);
    }
    const blink = runPy(TARGETS.find((t) => t.id === 'pi5')!.examples[0]!.code);
    expect(blink.end).toBe('stopped'); expect(blink.pins.get('GPIO17')!.filter(([, v]) => v === 1)).toHaveLength(11);
  });
  it.skipIf(!py)('says where a program breaks, as Python does', () => {
    const r = runPy('from gpiozero import LED\nled = LED(17)\nled.blnk()\n');
    expect(r.end).toBe('error'); expect(r.out.join('\n')).toMatch(/AttributeError/);
  });
  it.skipIf(!py)('sends mecademicpy\'s calls to the arm\'s controller, which runs them', () => {
    const r = runPy(TARGETS.find((t) => t.id === 'mecapy')!.examples[0]!.code);
    expect(r.meca[0]).toBe('ActivateRobot'); expect(r.said![r.said!.length - 1]).toBe('[3012][End of block.]'); expect(r.ok).toBe(true);
  });
  it('runs the Meca500\'s own commands on its controller', () => {
    const r = runMeca(TARGETS.find((t) => t.id === 'meca')!.examples[1]!.code);
    expect(r.ok).toBe(true); expect(r.said!.some((l) => l.includes('[2027]'))).toBe(true);
  });
});
