# Faults found in the code

Each fault here was checked in the code (by reading it or by a probe), not only reported by a research pass. A fault
reported but not checked is not listed. When one is fixed, its state says when and how, and `docs/REALITY.md` has the
entry. `compile.py` reads this table into `INDEX.md` and fails if a task named here does not exist.

| Id | Fault | Where | State | Task |
| --- | --- | --- | --- | --- |
| D1 | The wire check compares dimensions only: 60 rpm into Hz gives 6.283 Hz; torque wires to energy; Gy to Sv; a port with no unit wires to anything | `src/ganglia/units.ts` (rpm is 2π rad/min) | partly fixed 2026-11-01: rpm into Hz gives 1, torque and energy and Gy and Sv refused, a wire of another kind fails its node; a port with no unit still takes anything (42 starter wires rely on it: open) | 10.T11 |
| D2 | `dB` is a plain number with scale 1, so every decibel conversion is wrong | `src/ganglia/units.ts:22` | fixed 2026-11-01: dB goes only into dB | 10.T11 |
| D3 | `degC` always adds 273.15, so a 10 °C difference becomes 283.15 K | `src/ganglia/units.ts:38` | fixed 2026-11-01: ΔK, ΔdegC, ΔdegF; the laws' temperature differences take ΔK; a temperature into one is refused | 10.T11 |
| D4 | The units file's header cites `dimensionsOf` and `ganglia.test.ts`; neither exists | `src/ganglia/units.ts:4` | fixed 2026-11-01: the header says what checks the units | 10.T11 |
| D5 | No early cutoff: a node's key is built from its inputs' keys, not their values, so a node that reruns to the same value reruns everything below it | `src/nexus/dataflow.ts:289` | fixed 2026-11-01: keys from the values wired in (`valueKey`); a node rerun to the same value reruns nothing below it, counted in the gate | 11.LW12 |
| D6 | `stable()` writes every Map and Set as `{}` and every function as `undefined`, so it cannot tell such values apart (group feeds already rely on it) | `src/nexus/dataflow.ts:42` | fixed 2026-11-01: keys use `digest` (Maps, Sets, typed arrays, NaN, −0, functions told apart); the gate checks cached against fresh | 11.LW15 |
| D7 | Blocks count as pure unless they say otherwise; nothing checks a block that reads the clock, chance or the network | `src/nexus/dataflow.ts:301` (`b.pure`) | partly fixed 2026-11-01: the gate fails a pure block whose own run reads the clock, chance, the network or the AI (unless as a measured port); what it calls further down is not yet seen | 11.LW12 |
| D8 | The interference check excuses any pair where either part is named like a fastener (bolt, clip, plug, …), against every other part | `src/nexus/make/rules.ts:43`, `:50` | open | 10.T24 |
| D9 | The interference check ignores overlaps shallower than 0.5 mm | `src/nexus/make/rules.ts:72` | open | 10.T24 |
| D10 | A wire into an input a folded block lacks was kept silently; the AI's guide taught one (`k.value>s.rate`, `rate` being an output) and the spring ran on its defaults (11,308.6 N/m, not 40,000) | `src/nexus/dataflow.ts:425`, `docs/FOR-AI.md` | fixed 2026-10-31: refused with the input named; the guide wires `n`; the gate runs the guide's plan | — |
| D11 | The headset panels are added to the scene, not to the player's rig, so they stay behind when you move | `src/nexus/view/space.ts:219` | fixed 2026-11-01: walking carries the panels and the zoom's pivot; measured in an emulated Quest 3, every panel's distance and angle unchanged after moving 2 m right and 3 m ahead | 04.P10 |
| D12 | Explode only spreads parts out (a container's contents lifted): no order, no direction of removal, no fasteners, no tools | `src/nexus/assembly.ts:294` | open | 01.I27 |
| D13 | Constants were CODATA 2018 | `src/data/constants.ts` | fixed 2026-10-31: CODATA 2022 values; three expected outputs recomputed | 10.T1 |
