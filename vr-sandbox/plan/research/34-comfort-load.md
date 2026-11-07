# Research (round 6): Human comfort and human load, including Nexus's own VR use
One research pass, 2026-10-31. Marks: [C] checked in this pass with its source; [M] from memory; [I] inference.

Builds on `28-body-medicine.md` (bodies as part families, the person-by-person fit check, and its branches list naming
ISO 7730, ISO 11228, NIOSH, Reswick and Rogers, ISO 9241-392 and IEC 63145, which this pass follows). Not repeated:
anthropometric percentiles and the multivariate accommodation method (28), quantity kinds and units (24), the trust
grades (10, 23). This pass reads each comfort or load limit as a check node with its standard, its inputs, its
validity range, and the population it was fitted on; then measures the space page's own panels and walking against
the VR limits, with numbers worked from `src/nexus/view/space.ts` and `src/nexus/view/pad.ts`.

## (A) Findings

### A1. Thermal comfort: three models, three validity domains

- [C] ISO 7730:2005 computes PMV from six inputs and PPD from PMV: **PPD = 100 − 95·exp(−0.03353·PMV⁴ − 0.2179·PMV²)**.
  The index "should be used only for values of PMV between −2 and +2", and when M is 46–232 W/m² (0.8–4 met), Icl
  0–2 clo, air temperature 10–30 °C, mean radiant temperature 10–40 °C, air speed 0–1 m/s; time-weighted averages over
  the previous hour may be used. The PMV/PPD table rests on "experiments involving 1 300 subjects"; at PMV 0 the PPD is
  still 5 % (https://cdn.standards.iteh.ai/samples/39155/9632a0563ca742209edb45856ff69296/ISO-7730-2005.pdf).
- [M] ISO 7730 Annex A categories: A (PPD < 6 %, −0.2 < PMV < +0.2), B (< 10 %, ±0.5), C (< 15 %, ±0.7), plus local
  discomfort limits (draught rating, vertical air temperature difference, floor temperature, radiant asymmetry).
- [C] An EN ISO 7730:2025 revision is listed (https://standards.iteh.ai/catalog/standards/cen/6564c624-9a02-43dd-8a93-1f212c941c50/en-iso-7730-2025);
  its changes were not read. [I] A node citing "ISO 7730" must carry the edition.
- [C] ASHRAE 55 graphical comfort zone is PMV −0.5 to +0.5; its 80 % acceptability is 10 % whole-body PPD plus 10 %
  allowed for local discomfort (https://www.ashrae.org/file%20library/technical%20resources/standards%20and%20guidelines/standards%20addenda/55_2017_d_20200731.pdf;
  CBE tool, https://comfort.cbe.berkeley.edu).
- [C] ASHRAE 55 adaptive model: comfort operative temperature = **0.31·t_pma(out) + 17.8 °C**, ±3.5 °C (80 %),
  ±2.5 °C (90 %); 80 % upper = 0.31·t + 21.3, lower = 0.31·t + 14.3. Valid only for occupant-controlled naturally
  conditioned spaces, no mechanical cooling, no heating in operation, **1.0–1.3 met**, clothing free within 0.5–1.0 clo,
  and prevailing mean outdoor **10–33.5 °C**; "may not be extrapolated" (ASHRAE 55-2010 addendum d,
  https://www.ashrae.org/file%20library/technical%20resources/standards%20and%20guidelines/standards%20addenda/55_2010_d_published.pdf;
  CBE tool). EN 16798-1: 0.33·t_rm + 18.8 °C, bands +2/−3, +3/−4, +4/−5 °C for categories I–III
  (https://climate4buildings.com/guides/adaptive-thermal-comfort).
- [C] UTCI is the air temperature of a reference condition giving the same response of the **UTCI-Fiala** multi-node
  thermoregulation model plus a temperature-dependent clothing model; ten stress bands: > 46 extreme heat, 38–46 very
  strong, 32–38 strong, 26–32 moderate, **9–26 no thermal stress**, 0–9 slight cold, 0 to −13 moderate, −13 to −27 strong,
  −27 to −40 very strong, < −40 extreme cold (https://climate-adapt.eea.europa.eu/en/metadata/indicators/thermal-comfort-indices-universal-thermal-climate-index-1979-2019;
  https://utci.lobelia.earth/what-is-utci). The Fiala active system was regressed on exposures at 0.8–10 MET
  (https://www.utci.org/resources/develop_utci.pdf).
- [I] The three are not rivals but three domains: PMV for steady, mechanically conditioned indoor rooms; adaptive for
  free-running buildings; UTCI (dynamic, outdoor) for streets, sites and the living world. A check node must refuse
  inputs outside its domain rather than extrapolate; this is spec 10's "validity" field made concrete.

### A2. Manual handling: one equation, two standards, one percentile table

- [C] Revised NIOSH lifting equation (1991, Applications Manual 1994, revised 2021): **RWL = LC·HM·VM·DM·AM·FM·CM**,
  LC = 23 kg (51 lb), LI = load / RWL; LI > 1.0 "likely pose[s] an increased risk of lifting-related low back pain for
  some fraction of the workforce"; RWL is the load nearly all healthy workers could lift for up to 8 h
  (https://www.theleansuite.com/tools/niosh-lifting-equation-calculator; https://www.longdom.org/open-access/the-niosh-lifting-equation-for-manual-lifting-and-its-applications-23286.html).
  Standard origin 75 cm (30 in) high, horizontal 25 cm (10 in) in the revised form (longdom).
- [M] Multipliers: HM = 25/H (H 25–63 cm), VM = 1 − 0.003·|V − 75|, DM = 0.82 + 4.5/D, AM = 1 − 0.0032·A, FM and CM
  from tables. Validity: two-handed, smooth, no carrying, pushing or one-handed lifting; not seated or kneeling; good
  floor friction. [I] A node that receives a one-handed or seated task must say "out of domain".
- [C] ISO 11228-1 (2nd ed. 2021 replaces 2003) is built on the NIOSH formula with reference mass 25 kg for ideal
  conditions, loads ≥ 3 kg; secondary sources give cumulative carrying of 10 000 kg per 8 h over ≤ 10 m and 6 000 kg
  over 20 m (https://www.schmalz.com/en/support/know-how/glossary/iso-11228; https://www.puntosicuro.it/movimentazione-carichi-C-44/la-valutazione-del-sollevamento-trasporto-carichi-nella-iso-11228-1-AR-17116/).
  Not read in the standard itself; treat the figures as [C, secondary].
- [C] Liberty Mutual (Snook–Ciriello) tables give **percent of male and female population** able to do a lift, lower,
  push, pull or carry; a common design target is 75 % of women; the 1991 tables combined 11 experiments. Potvin,
  Ciriello, Snook, Maynard and Brogmus (*Ergonomics* 64(8), 2021) published equations meant to replace them
  (https://libertymmhtables.libertymutual.com/references; https://ergoweb.com/changes-planned-for-liberty-mutual-manual-materials-handling-tables/).
- [I] NIOSH answers "is this under a limit"; Liberty Mutual answers "what share of people can do this". The second is
  the same shape as research 28's person-by-person fit check, and should be Nexus's default output form.

### A3. Pressure over time

- [C] Reswick and Rogers (1976) gave a pressure–time tolerance curve for sitting and lying; Gefen (2009, *Nursing
  Standard* parts 1–2) shows it is inaccurate at both ends of the timescale (very high loads damage in minutes; very low
  loads never do) and proposes a **sigmoid** strain/pressure–time threshold from animal and tissue-engineered models
  (Linder-Ganz et al.; Gefen et al.) (https://pubmed.ncbi.nlm.nih.gov/19678520; https://cdn.ymaws.com/npiap.com/resource/resmgr/pdsi/2021_iwj_our_contemporary_un.pdf).
- [C] The NPIAP 2021 review states it is "not possible to determine generic quantitative values for tissue damage
  thresholds" because of individual anatomy and confounders (same NPIAP PDF). [M] The often-quoted Linder-Ganz rat
  numbers (about 32 kPa for under an hour, about 9 kPa long-term on muscle) are animal values.
- [I] A pressure check node is therefore a *time-integrated* check of the interface (seat, strap, headset facial pad,
  grip) against a sigmoid, marked "animal model, indicative"; it can rank designs, not certify one.

### A4. Vibration and noise

- [C] Directive 2002/44/EC: hand-arm A(8) action 2.5 m/s², limit 5 m/s² (based on the ISO 5349-1 vector sum a_hv);
  whole-body A(8) action 0.5 m/s², limit 1.15 m/s², or VDV 9.1 and 21 m/s^1.75; whole-body A(8) from the highest of
  1.4·a_wx, 1.4·a_wy, a_wz (https://www.legislation.gov.uk/eudr/2002/44/2020-12-31/data.xht?view=snippet&wrap=true;
  https://jmrp.io/phonometry/reference/api/vibration/exposure). [I] The ISO standards fix the weighting and the
  measurement; the numbers that act come from law, which differs by country: two separate sources, two node fields.
- [C] Noise: OSHA PEL 90 dBA TWA with a 5 dB exchange rate, action level 85 dBA, TWA = 16.61·log10(D/100) + 90; NIOSH
  REL 85 dBA with 3 dB exchange; NIOSH estimates 8 % excess risk of material hearing impairment over 40 years at 85 dBA
  and 25 % at 90 dBA; the same shift can be 0.92 of the OSHA dose and 2.5 of the NIOSH dose
  (https://www.soundtrace.com/blog/niosh-vs-osha-exposure-limits; https://isienvironmental.com/blog/osha-niosh-noise-exposure-5db-3db-exchange-rate-hearing-conservation).
  [M] EU 2003/10/EC: 80/85 dB(A) lower/upper action values, 87 dB(A) limit at the ear with protectors; A-weighting from
  IEC 61672-1.
- [I] "Dose" with a chosen exchange rate is a parameter of the check, not a constant: a noise node must name its
  criterion set (OSHA, NIOSH, EU), or two honest engineers get answers a factor 2.7 apart.

### A5. Strength and reach data

- [C] Dodds et al. 2014 (PLoS ONE 9(12): e113637): 60 803 observations, 49 964 people, 12 British studies, ages 4–90;
  peak median grip **51 kg men (ages 29–39), 31 kg women (26–42)**; weak grip = 2.5 SD below the sex-specific peak mean,
  23 % of men and 27 % of women by age 80 (https://pubmed.ncbi.nlm.nih.gov/25474696/). [I] A handle or a lever check
  should draw its force from these centiles by age and sex, not from a single "human" value.
- [M] Reach envelopes come from anthropometric surveys (ANSUR II, CAESAR) via research 28; ISO 7250-1 defines the
  measurements; ISO 14738 gives workstation reach. Not checked this pass.

### A6. The eye in a headset: vergence and accommodation

- [C] Shibata, Kim, Hoffman, Banks (*J Vision* 2011, 11(8):11) measured a zone of comfort in diopters as two lines
  Df = m·Dv + T (far and near), slopes slightly above 1, narrower at long distances; Percival's zone is a fair
  approximation (https://pmc.ncbi.nlm.nih.gov/articles/PMC3369815; https://www.spie.org/news/4831-discomfort-and-fatigue-from-stereo-3d-displays).
  Wikipedia summarises "up to 0.4 diopters is within comfort limits of most people"
  (https://en.wikipedia.org/wiki/Vergence%E2%80%93accommodation_conflict). [M] The fitted constants (far: m ≈ 1.035,
  T ≈ −0.626; near: m ≈ 1.129, T ≈ 0.442) are from memory and not checked.
- [C, secondary] Quest 2 focal distance about 1.3 m, attributed to John Carmack; a Meta forum thread of October 2026
  asks the Quest 3 / "Meta VR Glasses" value and shows no answer (search summary of
  https://communityforums.atmeta.com/questions-and-discussions-26/meta-vr-glasses-what-is-the-optical-focal-distance-of-the-virtual-image-180357).
- [I] With a 1.3 m focal plane (0.77 D) and a ±0.4 D band, vergence is comfortable from about **0.85 m to 2.7 m**
  (±0.5 D gives 0.79–3.7 m). Content at 0.69 m is 0.68 D off; at 0.55 m, 1.05 D.
- [C] ISO 9241-392:2015 "establishes recommendations for reducing the potential visual discomfort and visual fatigue
  experienced during viewing of stereoscopic images" (https://webstore.ansi.org/standards/iso/iso92413922015); its
  numbers were not read. [M] It is usually cited for keeping binocular disparity within about 1° and avoiding vertical
  disparity and interocular differences of size, luminance and colour.
- [C] IEC 63145 measures eyewear displays: 63145-20-10 (luminance, colour, uniformity, eye point), 63145-20-20 (image
  quality, Michelson contrast, **focal distance** in 6.6), 63145-22-10/-20 for AR (Frontiers in VR 2025 review,
  https://www.frontiersin.org/journals/virtual-reality/articles/10.3389/frvir.2025.1575870/pdf). [I] It measures the
  device, not the person; ISO 9241-392 judges content. Nexus needs both: the device's focal distance is an input to the
  VAC check.

### A7. Where to put a panel, and how big its text

- [C] Meta MR guideline: objects at "roughly 1 meter distance slightly below the user's line of sight"; angular scaling
  with min/max limits so text keeps its angular size as distance changes (https://developers.meta.com/horizon/design/mr-design-guideline).
- [C] Meta hands UI: indirect (ray) interaction is comfortable from **0.8 m to 3 m**; do not put ray UI nearer than
  0.8 m; direct touch **0.42–0.46 m**; avoid the middle **0.5–0.8 m**; minimum angular collider **2.5°–3°**; 48 dp hit
  target ≈ 22 mm at touch distance; 12 mm between interactables (https://developers.meta.com/vr/design/hands-ui-best-practices).
- [C] Meta's field-of-view page (updated Oct 28 2026) gives Meta VR Glasses a 70° × 66° field and a recommended design
  area of **58° × 54°** for essential UI; face shape, fit and gaze reduce what is seen
  (https://developers.meta.com/horizon/essentials/field-of-view).
- [C] Meta typography: 14 px minimum for legibility, 18 px or larger for comfortable reading (panel px), sans-serif with
  high x-height (https://developers.meta.com/vr/design/styles_typography). Microsoft Mixed Reality: minimum legible text
  0.35°–0.4° at 2 m (12–14 mm), comfortable **0.6°–0.75°** at 2 m and 0.65°–0.8° at 0.45 m; avoid thin weights under
  42 pt (https://learn.microsoft.com/en-us/windows/mixed-reality/design/typography).
- [C] Büttner et al. (IEEE VR 2020): text rotated 60° or more about the vertical axis needs much larger size regardless
  of distance or font; size measured as x-height in dmm (https://buettnerandre.com/files/2020/IEEEVR2020_The_influence_of_text_rotation_font_and_distance_on_legibility_in_VR__Preprint.pdf).
- [C, secondary] Alger (2015): comfortable head yaw 30° each way (max 55°), pitch 20° up (max 60°), 12° down (max 40°)
  (https://www.dummies.com/article/technology/programming-web-design/general-programming-web-design/designing-augmented-reality-apps-comfort-zones-interfaces-and-text-256462/);
  original PDF not read.
- [C, secondary] Quest 3 peak about 25 pixels per degree; Meta's CTO names 45 PPD as a goal (https://mixed-news.com/en/?p=25310).

### A8. Moving without sickness

- [C] Meta locomotion best practices: snap turns, quick turns, blinks and teleports reduce vection; smooth turning
  opt-in; match avatar speed to real walking and running; vignettes during movement; limit acceleration; offer
  Recommended / Comfortable / Advanced presets (https://developers.meta.com/vr/design/locomotion-best-practices).
  **Quantized velocity**: fixed speeds switched instantly; stepped translations (https://developers.meta.com/vr/design/locomotion-comfort-usability).
- [C] Meta's Interaction SDK vignette is defined **in degrees**, not UV, so it occludes the same field on any headset;
  it can react to rotation, linear speed and acceleration (https://developers.meta.com/vr/documentation/unity/unity-isdk-locomotion-comfort).
- [C] Unity XRI snap turn defaults to 45° (https://equalentry.com/virtual-reality-accessibility-snap-turning).
- [C] SSQ (Kennedy, Lane, Berbaum, Lilienthal 1993): 16 symptoms, three clusters, N ×9.54, O ×7.58, D ×13.92, total
  (N+O+D raw) ×3.74; scores move in coarse steps (https://www-users.cse.umn.edu/~suma/WISP/WISP_2020_bimberg.pdf;
  https://cgvr.cs.uni-bremen.de/teaching/vr_literatur/Simulator%20Sickness%20Questionnaire,%20An%20Enhanced%20Method%20for%20Quantifying%20Simulator%20Sickness%20-%20Kennedy,%20Lane,%20Berbaum,%20Lilienthal,%201993.pdf).
  Baselines are not zero in a normal population (oculomotor raw mean ≈ 6.4) (https://www.frontiersin.org/journals/virtual-reality/articles/10.3389/frvir.2022.945800/full).
- [C, secondary] Saredakis et al. 2020 meta-analysis: pooled HMD total SSQ ≈ 28.0 (95 % CI 24.7–31.4); Stanney 2003
  found a sustained rise beyond 15 min in 15/30/45/60 min exposures; adaptation evidence is mixed (search summary).
- [C] Meta warnings (Quest 2 / Pro): when new to the headset or an app, take a break at least every 30 min; the older
  Quest manual said 10–15 min every 30 min; work guidance says every 30–45 min
  (https://www.meta.com/legal/quest/health-and-safety-warnings/quest-3/; https://forwork.meta.com/ie/getting-started-with-quest/).
- [M] Preferred human walking speed ≈ 1.3–1.4 m/s (Bohannon 1997); dynamic FOV restriction reduces sickness
  (Fernandes and Feiner 2016).

### A9. The space page measured against these (worked from the code, 2026-10-31)

The headset UI group `ui` stands at the head when `recentre()` runs (space.ts:231); numbers below are in that frame
(x right, y up from the eye, −z ahead). Text sizes use the canvas px to metre of each `Panel`.

| Piece (space.ts) | Where | Distance | Direction | Finding |
| --- | --- | --- | --- | --- |
| Board, normal (l.224) | 1.008 × 0.567 m at (0.12, 0.08, −1.25) | 1.25 m | centre +3.7°, spans −17° to +27° yaw, +16° to −9° pitch | distance good (0.03 D VAC); centre above eye, Meta says below; off-centre by 0.12 m |
| Board, big (scale 0.6) | 1.44 × 0.81 m | 1.25 m | 60° wide | exceeds 58° design area |
| Board text (nodes.ts 11–14 px at k ≈ 1) | canvas is the page canvas, client width × dpr, stretched to 1.008 m | 1.25 m | em 0.29°–0.50° for 1920–1280 css px wide | below 0.6° comfortable, at or below 0.4° minimum; x-height 4–6.6 display px at 25 PPD. **Legibility depends on the desktop window's width** [I] |
| Bar (l.153, l.224) | 1.53 × 0.09 m at (0, −0.44, −1.05) | 1.14 m | pitch −22.7°, **72° wide** | wider than the 70° field: its ends cannot be seen without turning |
| Bar text 28 px / 22 px | | | em 0.90° / 0.71° | comfortable |
| Bar buttons (H − 44 px) | ≈ 62 mm tall | | ≈ 3.1° | meets 2.5°–3° |
| Chat (l.189, l.224) | 0.62 × 0.22 m at (−0.95, 0.15, −1.0), yaw 0.45 rad | 1.39 m | **43.5° left**, viewed 18° oblique | beyond 30° comfortable yaw, inside 55° max; text 0.68° em, comfortable |
| Chat input hit (70 px) | 48 mm | 1.39 m | 2.0° | below 2.5° minimum |
| Keyboard (l.214) | (−0.2, −0.38, −0.55), tilt −0.5 rad | **0.70 m** | pitch −33° | in Meta's 0.5–0.8 m "avoid" band, ray-pressed though nearer than 0.8 m, 0.68 D VAC |
| XR left stick (l.326) | analogue 0–1.2 m/s × deflection, strafe allowed, deadzone 0.15 | | | not quantized, no vignette, speed not scaled with S (P-R8, P-R4) |
| XR right stick (l.325) | S × e^(±1.6 per s) about a pivot 0.9 m ahead, 0.4 m down | | | a 5× per second looming flow at full tilt, no vignette; P-R4 wants scale about the feet |
| Turning | none in XR (comment l.319 says "and turns you"; the code strafes) | | | P-R8 snap turns not built; right-stick x free |
| Panels while moving | `ui` is in the scene, the stick moves `rig` | | | panels are left behind as you move until a squeeze recentres |
| Desktop walker (pad.ts:58, 61) | 1.4 m/s, Shift 4 m/s, eye 1.6 m fixed | | | speed matches walking; eye height is one number, not the person's (research 28) |

## (B) What Nexus should take

1. **Check node shape for every comfort or load standard** (spec 10, 01). `check.<standard>` with: inputs as quantity
   kinds (24); the formula; the **validity box** copied from the standard (ISO 7730: 0.8–4 met, 0–2 clo, 10–30 °C air,
   10–40 °C radiant, 0–1 m/s, PMV −2..+2; ASHRAE adaptive: 10–33.5 °C outdoor, 1.0–1.3 met, no cooling); the
   **population** it was fitted on (1 300 subjects; 11 Snook experiments; 12 British studies); the edition; the
   jurisdiction where numbers come from law (2002/44/EC, OSHA, NIOSH). Out-of-box inputs return "out of domain", never a
   number. Mark: [I] from A1–A5.
2. **Thermal family** (spec 11 living world): `check.pmv-ppd` (ISO 7730 / ASHRAE 55 PMV), `check.adaptive`
   (ASHRAE 55 / EN 16798-1, chosen by building mode), `check.utci` (outdoor, from the Fiala model; a lookup or the
   published polynomial, not the full model at first). A room or street picks one by its own state (mechanically
   conditioned or not, indoor or out); the choice is shown.
3. **Handling family** (spec 01 interfaces: a part with a handle carries its lift): `check.niosh-rwl` (two-handed lift),
   `check.iso11228` (lift, carry cumulative mass), `check.liberty-mutual` (percent of men and women capable, for lift,
   lower, push, pull, carry, Potvin 2021 equations). Output defaults to **percent of people capable** so it joins the
   fit check of research 28.
4. **Pressure-time node** (spec 01, 09): integrates interface pressure over time on a body region against a sigmoid
   threshold, labelled "animal-model indicative, ranks designs, does not certify" (trust grade C in spec 10). Applies
   to seats, straps, grips, and Nexus's own headset pad.
5. **Vibration and noise nodes** (spec 09 feeds them): `check.wbv` (ISO 2631-1 weighting, A(8) and VDV, action and limit
   from the chosen law), `check.hav` (ISO 5349-1 a_hv), `check.noise-dose` with criterion level and exchange rate as
   explicit inputs; the result shows the dose under each named criterion side by side, so the factor-2.7 gap is visible.
6. **Strength from data, not a constant** (spec 07 ideas, 28): `body.grip(age, sex, centile)` from Dodds 2014 centiles
   (and other national data as alternatives); a handle's required force checks against it.
7. **VR comfort as checks on Nexus itself** (spec 04 being in it, and the constitution's checks): a test that reads
   the laid-out panels and asserts, in the head frame:
   - every essential panel inside 58° × 54° (Meta design area) and its centre within 30° yaw;
   - ray-pressed UI at ≥ 0.8 m, touch UI at 0.42–0.46 m, nothing in 0.5–0.8 m;
   - every interactive target ≥ 2.5° (aim 3°);
   - every text em ≥ 0.6° (comfortable), never < 0.4°;
   - vergence distance within ±0.4 D of the device focal distance (default 1.3 m, marked [M] until measured);
   - no reading surface rotated ≥ 60° from the view.
   These are numbers with sources; each line names its source and mark (spec 10).
8. **Concrete placement for the space page** (spec 04; numbers worked here, [I] from A6–A7):
   - **Board**: keep 1.25 m (0.03 D VAC). Move the centre to about −10° (y ≈ −0.22, x = 0), so it sits slightly below
     the eye. Normal scale 0.42 (44° wide) is fine; cap "big" at 0.55 (1.32 m, 56°) instead of 0.6.
   - **Board text**: in the headset, draw the board canvas at a fixed logical width of about **1000 css px** (with
     dpr 2, 2000 texels, about 45 texels/° beyond 25 PPD), so 13 px node text is 13 mm ≈ 0.6° at 1.25 m. Today it is
     the desktop window's width, so a wider monitor makes the headset text smaller.
   - **Bar**: at 1.05 m and −22°, scale 0.74 instead of 0.9 (1.26 m, 58°), or fold into two rows; keep buttons ≥ 3°.
   - **Chat**: move to 30° left at 1.3 m: (−0.65, 0.0, −1.13), yaw +0.52 rad to face the eye; grow the input hit region
     to ≥ 3° (≥ 68 mm at 1.3 m).
   - **Keyboard**: either ray at 0.9 m, pitch −28° ((−0.15, −0.42, −0.78), tilted to face the eye, keys ≥ 2.5° ≈ 40 mm),
     or direct touch at 0.44 m with keys ≥ 22 mm and 12 mm gaps. Not 0.70 m.
   - **Panels follow the person**: parent `ui` to `rig` (or a lazy follow that recentres after > 30° yaw or > 0.5 m
     away), so the left stick does not leave the board behind.
9. **Walking in the headset** (spec 04 P-R8, P-R4):
   - left stick: **quantized** speeds, stopped / 1.4 m/s (walk) / 3 m/s (opt-in run), switched instantly; forward and
     back by default, strafing an option; speed × S so a 1:50 world is crossed at a scaled pace;
   - right stick x: **snap turn 30° (option 45°)**, with a short fade (blink) of about 0.1 s [M];
   - vignette in degrees (not UV) during any translation, turn or zoom: narrow the clear field to about 60–80° [M,
     Fernandes and Feiner], released over 0.2–0.3 s [M];
   - zoom S: cap the rate (for example ×2 per second), vignette while zooming, and scale about the feet (P-R4), not about
     a point 0.9 m ahead;
   - presets Comfortable / Recommended / Advanced (Meta), remembered per person (localStorage is fine: it is a
     per-viewer convenience).
   - desktop: keep 1.4 m/s; take eye height from the chosen body (research 28) instead of the fixed 1.6 m.
10. **Session length and sickness measure** (spec 10 way of working, spec 04): a gentle break prompt at 30 min of
    headset time (Meta's starter guidance), and an optional SSQ before and after a session stored with the session, so
    Nexus can measure its own comfort changes (raw and weighted scores both kept, baseline not assumed zero).
11. **Device facts as data** (spec 10, 24): a `device.headset` part with field of view, design area, PPD, focal
    distance, mass, each with source and mark (Quest 3 25 PPD [C secondary]; focal 1.3 m [M]); the VR checks read it, so
    a new headset changes the numbers without code changes. IEC 63145-20-20 6.6 is the named method to fill in focal
    distance.
12. **One rule for all of them** (constitution, spec 10): a comfort result is "share of people comfortable" with the
    population named, never "comfortable"; and a check that rests on law states its jurisdiction.

## (C) Questions

The 67 questions of this pass were chapter 30 of the book; 2 were kept when it was cut to the best on 2026-11-01 (decision 0010), each tagged Q30.n in `../BOOK-OF-QUESTIONS.md`; the rest are in git history.

## (D) New branches

- ISO 7730:2025 (EN ISO 7730:2025) changes from the 2005 edition
- ISO 7933 Predicted Heat Strain and ISO 7243 WBGT for work in heat
- ISO 8996 metabolic rate and ISO 9920 clothing insulation as data tables for the thermal nodes
- The UTCI operational polynomial (Bröde et al. 2012) and its error against the full Fiala model
- JOS-3 or the Fiala model in open code, for a browser thermoregulation solver
- The Potvin 2021 Liberty Mutual equations and their coefficients
- ISO 11228-2 push/pull and ISO 11228-3 OCRA repetitive handling
- Rapid Upper Limb Assessment (RULA), REBA and the Strain Index as pose-based checks from a simulated motion
- Linder-Ganz and Gefen sigmoid parameters, and human tissue-engineered data
- ISO 2631-1 Annex D motion sickness dose value for vehicles and ships Nexus simulates
- IEC 61672-1 A-weighting filter tolerances and an open verified implementation
- Kim et al. 2014 on the rate of change of vergence–accommodation conflict, for zoom limits
- Varifocal and light-field headsets (Meta Half Dome, Butterscotch) and what they remove from the VAC check
- Neck load from headset mass and UI pitch (biomechanics studies of HMD wear)
- Gorilla-arm fatigue measures (Consumed Endurance, Hincapié-Ramos 2014) for ray and touch panels
- Meta Horizon OS VRC accessibility requirements (snap turn, seated mode) as checks
- Fast Motion Sickness scale (Keshavarz and Hecht 2011) and the Virtual Reality Sickness Questionnaire (Kim 2018)
- Saredakis 2020 and Howard and Van Zandt 2021 meta-analyses read in full for duration and individual differences
- WebXR's own exposure of focal distance, IPD and field of view (or the lack of it)
- Curved (cylindrical) panel layouts and their legibility versus flat panels at 40°–60° width
