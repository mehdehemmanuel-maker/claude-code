// A board's drawn layout as JSON, to lay over its calibrated photos (tools/measure/photo.py overlay).
// Run: npm run boardmap -- <board id> <out.json>

import { writeFileSync } from 'node:fs';
import { boardMap, BOARD_DEFS } from '../boards/sbc';

const [id, out] = process.argv.slice(2);
if (!id || !out || !BOARD_DEFS[id]) { console.log(`npm run boardmap -- <board> <out.json>   (boards: ${Object.keys(BOARD_DEFS).join(', ')})`); process.exit(1); }
const m = boardMap(id);
writeFileSync(out, JSON.stringify(m, null, 1));
console.log(`${out}: ${m.parts.length} parts of the ${m.board}${m.approx ? ' (its layout approximate)' : ''}`);
