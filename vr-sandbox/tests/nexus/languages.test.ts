// Languages in pipeline steps: each by its category; OpenSCAD made the workshop's shapes, C++ (Arduino) made JavaScript
// that runs, SQL asked of the inventory, and every example read as a step.

import { describe, expect, it } from 'vitest';
import { LANGUAGES, byCategory, cppToJs, scadToSteps, sqlSelect, stepLanguage } from '../../src/nexus/teach/languages';
import { Workshop } from '../../src/nexus/ask/generate';
import { guessStep } from '../../src/nexus/substrate/flows';
import { INVENTORY } from '../../src/nexus/parts/inventory';

describe('languages, by what they are for', () => {
  it('each has a category and type, says whether it runs here, and its example is read as a step in it', () => {
    expect([...byCategory().keys()]).toEqual(expect.arrayContaining(['Machine control', 'Programming', 'Embedded', 'CAD and geometry', 'Data', 'Maths']));
    for (const l of LANGUAGES) { if (l.id === 'pipeline') continue; const s = stepLanguage(l.example); expect(s?.lang.id, l.example).toBe(l.id); expect(guessStep(l.example)?.kind).toBe('action'); }
    expect(stepLanguage('note good: it held')).toBeNull();
  });
});

describe('OpenSCAD into the workshop', () => {
  it('cubes, cylinders and spheres, moved by translate and variables, stand where OpenSCAD puts them (its z up)', () => {
    const { steps, notes } = scadToSteps('w = 20; cube([w, 30, 10]); translate([0, 0, 10]) cylinder(h = 20, d = 8); translate([50, 0, 0]) { sphere(r = 5); } rotate([0, 0, 45]) cube(5, center = true);');
    expect(notes.join(' ')).toMatch(/rotate\(\) is left out/);
    const w = new Workshop({ parts: () => [] }, 1); for (const st of steps) w.run(st, 'you');
    const made = Object.fromEntries(w.all().made.map((m) => [m.name, m]));
    expect(made.cad1!.dims).toMatchObject({ w: 0.02, d: 0.03, h: 0.01 }); expect(made.cad1!.at.map((x) => +x.toFixed(4))).toEqual([0.01, 0.005, 0.015]);
    expect(made.cad2!.at.map((x) => +x.toFixed(4))).toEqual([0, 0.02, 0]);
    expect(made.cad3!.at.map((x) => +x.toFixed(4))).toEqual([0.05, 0, 0]);
    expect(made.cad4!.at.map((x) => +x.toFixed(4))).toEqual([0, 0, 0]);
  });
});

describe('C++ (Arduino) into JavaScript', () => {
  it('declarations, functions, Serial and the loop run, reaching the device through forward and turn', () => {
    const js = cppToJs('#include <Arduino.h>\nconst int limit = 300;\nfloat speed = 0.2f;\nvoid setup() { Serial.begin(9600); Serial.println("ready"); }\nvoid loop() {\n  int d = distance();\n  if (d < limit) { turn(90); } else { forward(speed); }\n  delay(100);\n}');
    const logs: string[] = [], steps: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function('log', 'step', 'distance', 'turn', 'forward', js)((x: string) => logs.push(x), (s: string) => steps.push(s), () => 250, (d: number) => steps.push(`turn ${d}`), (v: number) => steps.push(`forward ${v}`));
    expect(logs).toEqual(['ready']); expect(steps).toEqual(['turn 90', 'wait 0.1 s']);
  });
});

describe('SQL over the inventory', () => {
  it('selects columns, filters with = and LIKE, and limits', () => {
    const rows = [...INVENTORY.values()].map((i) => ({ id: i.id, name: i.name, path: i.path.join('/'), kind: i.kind, make: i.make, says: i.says, spec: i.spec ?? '' }));
    const r = sqlSelect("select id, name from inventory where kind = 'product' and path like 'Mechanical/Bearings%' limit 3", rows);
    expect(Array.isArray(r)).toBe(true); expect((r as { id: string }[]).length).toBe(3); expect(Object.keys((r as object[])[0]!)).toEqual(['id', 'name']);
    expect(sqlSelect('delete from inventory', rows)).toMatch(/Only SELECT/);
  });
});
