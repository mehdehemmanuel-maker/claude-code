// `npm run works` — the works from the command line, so a plan can be read without writing a throwaway test.
//
// This exists because the last three rounds each began by writing a probe test whose only job was to print what the
// engine says, and then deleting it. Working a thing out by hand twice means it should be a tool (CLAUDE.md), and
// printing a plan had been worked out four times.
//
//   npm run works                        the works under $3,000, and the order to buy it in
//   npm run works -- $8000               the most capable works that money buys
//   npm run works -- gokart              a go-kart thrown at the $3,000 works
//   npm run works -- gokart metal        the same build in the metal shop
//   npm run works -- gokart 3k programs  and every program it sends
//   npm run works -- ender3              a maker's own machine routed, with the bootstrap share
//   npm run works -- fits 25             the fits and grades at a diameter
//   npm run works -- builds              what there is to throw at it
//   npm run works -- tend               the works with a robot on a rail in it: what it reaches, orders and does
//   npm run works -- tend gokart        and a go-kart run through it
//   npm run works -- tend gokart solder with a soldering head fitted to the robot, which it built itself

import { BUILDS, TIERS, bootstrapOf, buildById, jobForModel, jobText, programsText, throwAt, under3K, worksText, worksUnderText } from '../works';
import { fitsText } from '../parts/fits';
import { runText, runWorks } from '../works';

const args = process.argv.slice(2);
const want = (re: RegExp) => args.find((a) => re.test(a));
const money = want(/^\$?[\d,]+$/);
const build = args.find((a) => BUILDS.some((b) => b.id === a));
const tierOf = (): { name: string; stations: string[] } => {
  const t = TIERS.find((x) => args.includes(x.id));
  if (t) return t;
  const r = under3K();
  return { name: 'the works under $3,000', stations: r.ids };
};

if (args[0] === 'fits') { console.log(fitsText(Number(args[1] ?? 25))); }
else if (args[0] === 'tend') { console.log(runText(runWorks(args[1] ?? 'workbench', tierOf().stations, [], args.includes('solder') ? { tools: ['solder'] } : {}))); }
else if (args[0] === 'builds') {
  for (const b of BUILDS) console.log(`${b.id.padEnd(11)} ${b.lines.length} lines, ${(b.joins ?? []).length} kinds of joint — ${b.what}\n            ${b.src}`);
}
else if (args.includes('ender3') || args.includes('voron24')) {
  const m = args.includes('voron24') ? 'voron24' : 'ender3', w = tierOf();
  console.log(bootstrapOf(w.stations, m, 'build').says, '\n');
  console.log(jobText(jobForModel(m, w.stations)));
}
else if (build) {
  const w = tierOf(), b = buildById(build), j = throwAt(b, w.stations);
  console.log(`${b.what}\n${b.src}\n\nIn ${w.name}:`);
  console.log(jobText(j));
  if (args.includes('programs')) console.log(`\n${programsText(j)}`);
  if (!j.audit.ok) process.exitCode = 1;
}
else if (money) { console.log(worksUnderText(Number(money.replace(/[$,]/g, '')))); }
else { console.log(worksUnderText(3000)); console.log(`\n${worksText(under3K().ids, 'build')}`); }
