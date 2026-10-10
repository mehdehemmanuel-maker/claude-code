// A build pack as a program: what you ask for, priced and sourced, its bench, its custom part's files and its lessons,
// written into a folder to take to the sellers and the makers.
// Run: npm run pack -- "<what you want>" <folder> [--budget 150] [--have computer,printer,usbc-charger,soldering-iron]

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pack, packText, type Have } from '../teach/buildpack';

const args = process.argv.slice(2), opt = (k: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const budget = opt('budget'), hasList = (opt('have') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const [asked, dir] = args;
if (!asked || !dir) { console.log('npm run pack -- "<what you want>" <folder> [--budget 150] [--have computer,printer]'); process.exit(1); }
const have: Have = { budget: budget ? Number(budget) : undefined, computer: hasList.includes('computer'), printer: hasList.includes('printer'), usbcCharger: hasList.includes('usbc-charger'), solder: hasList.includes('lead-free') ? 'lead-free' : 'leaded', owns: hasList.filter((k) => !['computer', 'printer', 'usbc-charger', 'lead-free'].includes(k)) };
const p = pack(asked, have);
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'pack.md'), packText(p));
p.made.forEach((m, i) => { const sub = p.made.length > 1 ? join(dir, `part-${i + 1}`) : dir; mkdirSync(sub, { recursive: true }); for (const [n, data] of Object.entries(m.files)) writeFileSync(join(sub, n), data); });
console.log(`${dir}/pack.md: ${p.lines.filter((l) => l.section !== 'have').length} lines, total $${p.total.all[0].toFixed(2)}${p.total.all[1] !== p.total.all[0] ? `-${p.total.all[1].toFixed(2)}` : ''}; ${p.made.length} custom part${p.made.length === 1 ? '' : 's'}; ${p.lessons.length} lessons`);
