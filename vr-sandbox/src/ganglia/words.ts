// Ego's words for flows: how her language names what passes between blocks. One table, read the same way everywhere
// (the intent parser, the challenges): a word means a flow when it is one of the flow's words, or begins with one of
// its stems of four letters or more ("turning" is rotation, "batteries" electric). A word that means none is a word
// her language doesn't have yet, which a challenge reports as unsayable.

import type { Flow } from './blocks';

export const FLOW_WORDS: Record<Flow, string[]> = {
  electric: ['electric', 'electricity', 'current', 'battery', 'batteries', 'power', 'volt', 'voltage'],
  rotation: ['rotation', 'rotary', 'rotat', 'spin', 'turn', 'torque', 'revolv'],
  translation: ['stroke', 'push', 'linear', 'translat', 'lift', 'press'],
  travel: ['travel', 'motion', 'move', 'movement', 'moving', 'locomotion', 'flight', 'fly', 'drive', 'driving', 'going'],
  load: ['load', 'force', 'weight', 'support', 'hold'],
  signal: ['signal', 'information', 'bit', 'bits', 'data', 'logic', 'control', 'command'],
  heat: ['heat', 'warmth', 'warm', 'temperature'],
  stock: ['stock', 'material', 'filament'],
  chemical: ['chemical', 'food', 'fuel', 'sugar', 'nutrient'],
  light: ['light', 'sunlight', 'sun', 'photon'],
  sound: ['sound', 'audio', 'acoustic', 'voice', 'speech', 'hearing', 'noise', 'music'],
};

const matches = (token: string, w: string) => token === w || (w.length >= 4 && token.startsWith(w));

/** The flow a single word names, or null. */
export function flowOfWord(word: string): Flow | null {
  const t = word.toLowerCase().trim();
  for (const [f, ws] of Object.entries(FLOW_WORDS) as [Flow, string[]][]) if (ws.some((w) => matches(t, w))) return f;
  return null;
}

/** The flow a phrase names: its first word that names one ("rotary motion" is rotation, "electric power" electric). */
export function flowOfPhrase(phrase: string): Flow | null {
  for (const t of phrase.toLowerCase().split(/[^a-z]+/).filter(Boolean)) {
    const f = flowOfWord(t);
    if (f) return f;
  }
  return null;
}
