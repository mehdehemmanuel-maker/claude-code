// Build the workbench: bundle Nexus into one script, then inline it into the page, so the page runs anywhere a browser
// does (a headset's included) with nothing to install and nothing to fetch but its fonts.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
execSync('npx vite build --config tools/workbench/vite.config.ts', { stdio: 'inherit', cwd: here('../..') });
// a bundle inlined in a page must not close the script it is in, nor open a comment
const bundle = readFileSync(here('../../dist-workbench/nexus.js'), 'utf8').replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const page = readFileSync(here('./workbench.html'), 'utf8').replace('/*NEXUS_BUNDLE*/', () => bundle);
writeFileSync(here('../../dist-workbench/workbench.html'), page);
console.log(`dist-workbench/workbench.html: ${(page.length / 1024).toFixed(0)} kB`);
