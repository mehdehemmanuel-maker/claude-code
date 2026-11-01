# 0012. The headset layout departs from research 34's first numbers where measurement showed they could not all hold

Date: 2026-11-01. State: accepted (by the builder: a technical choice, decision 0011; reversible).

## Context

Spec 04, task P10 took research 34's proposals: chat 30° to the side at 1.3 m, the bar scaled 0.74, the keyboard at
0.9 m, text at least 0.6°, every target at least 2.5°. The evaluator failed P10 (2026-11-01) partly because the layout
built had moved chat to 42° and the bar to 0.62 with no record of why. Measured in the emulated Quest 3
(`npm run eval:headset`): with the board wide enough for 0.6° text (51° across), a chat panel at 30° overlaps the
board's edge; and a one-row bar cannot keep within the 58° Meta designs for while giving its buttons 2.5° (the width
needs a scale of at most 0.77, the buttons at least 0.87); at 34° below the eye the keyboard covered the bar.

## Options

1. Keep the research's numbers and shrink the board until chat at 30° clears it (its text then under the 0.4° least)
2. Keep the board's text comfortable; move chat out to clear it; give the bar two rows; lower the keyboard

## Choice

The second: the board drawn at a fixed 780 css px in a headset (its 11 px text 0.60°, its 13 px text 0.71°); chat 42°
to the side at 1.3 m (3.1° clear of the board; past Meta's 30° comfortable turn of the head, inside its 55° most); the
bar in two rows (S over T), 39° wide, every button 2.6° or more; the keyboard 0.62 m wide at 0.9 m, 45° below the eye
(7.2° clear of the bar). Each limit is checked by `npm run eval:headset`, which fails on any one outside it.

## The assumption it rests on

That a 42° head turn to read chat is acceptable for a panel glanced at, not read for long; and that an emulator's
geometry stands for a real headset's (it measures angles, not comfort felt).

## When to test it again

On a real Quest (spec 03, task W5, once the app is reachable from the headset): if turning to chat is felt as a
strain, bring chat in front, under the board, and the bar beside it.
