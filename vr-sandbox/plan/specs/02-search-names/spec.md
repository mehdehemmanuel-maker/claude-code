# Spec 02, search in tiers and the names index

The user's words (2026-10-31): "we especially need faster searches advanced names populate the library with just names
and stuff like words specific too it like subcategory's … but don't make those count as there only real nodes count for
faster searches advanced names index".

## Starts from (checked 2026-10-31)

`navigate.ts`'s `search`: every library's entries scanned on each query (about 12 ms a search over about 8,000 entries,
measured), words that say nothing left out, misspelt words corrected (edit distance 1 or 2) to the library's own,
other words (`ALSO`), the nearest match where nothing has every word; the app's features as a library (`APP`). The
gate holds it: every node by name and id in the first three, twenty plain and misspelt questions.

## Requirements

- **N-R1.** THE SYSTEM SHALL keep a names index apart from the node library: terms, their other words, their category
  path, and the nodes each routes to, each with its source and licence.
- **N-R2.** THE SYSTEM SHALL never count a name as a node: the node count is what runs.
- **N-R3.** WHEN a name routes to no node, THE SYSTEM SHALL route to the nearest broader name that has one and say
  "nearest real node", never make one up.
- **N-R4.** THE SYSTEM SHALL answer a search in under 3 ms on a mid-range phone for exact and fuzzy matches, measured on
  the device, and SHALL never block the 3D view while it does.
- **N-R5.** WHEN words match nothing by spelling, THE SYSTEM SHALL find by meaning among the nodes and categories, where
  the device can afford it (measured), and fuse it with the spelling results by rank.
- **N-R6.** THE SYSTEM SHALL keep every imported vocabulary as its licence asks (no-derivative files unmodified, with our
  mapping beside them).

## Design

**The entry** (`src/data/names/`, one file per source, plus mappings):

```ts
interface NameEntry {
  id: string;                    // "ifc:IfcBridge", "uniclass:Co_80_50", "osm:bridge=viaduct", "uscs:SM"
  term: string;                  // the preferred word
  other: { text: string; kind: 'alt' | 'abbrev' | 'misspelling' | 'trade' | 'plural'; lang?: string }[];
  path: string[];                // the disciplines tree's ids (src/data/disciplines.ts): ["civil", "transportation", "bridges"]
  routes: { node: string; set?: Record<string, unknown>; weight: number; why: string }[];   // may be empty
  broader?: string[]; narrower?: string[]; related?: string[];
  same?: { scheme: string; code: string }[];   // the same thing in other schemes (IFC ↔ Uniclass ↔ OSM ↔ Wikidata)
  source: { scheme: string; code?: string; version: string; url: string; licence: string; taken: string };
}
```

**The first vocabularies** (`research/04-civil-names.md` for each licence): IFC 4.3's entities and their predefined
types (the spine: buildings, roads, rail, bridges, ports); Uniclass 2015's tables; OpenStreetMap's infrastructure tags
(taginfo); designations (soil groups, concrete and timber classes, bar sizes, section series); ETIM's product classes;
Wikidata's aliases and translations (CC0). Each imported by a script that keeps its source and licence on every row.

**Search in tiers** (`research/05-search-perception.md` for the measurements):

1. **Exact**: every name, id, code and alias, normalised, in a sorted table, binary searched (target under 0.2 ms).
2. **Fuzzy and fielded**: an index built at build time (name ×3, other words ×2, path ×1; prefix; typo tolerance), saved
   and loaded, run in a worker. MiniSearch first; uFuzzy if MiniSearch measures over 3 ms on our entries on the weakest
   device. The correction and the `ALSO` words we have feed it.
3. **By meaning**: about 600 nodes and the categories, their vectors worked out at build time; the query embedded on the
   device by a small model (all-MiniLM, about 23 to 35 MB) loaded only when asked; fused with tier 2 by reciprocal rank
   (k = 60). Measured on a phone before it is turned on by default.

**Owners**: `navigate.ts` (search), `src/data/names/` (the vocabularies), the gate's navigation test.

## Tasks

| Id | Task | Check | After |
| --- | --- | --- | --- |
| N1 | The NameEntry schema; a loader; the test that names are not nodes | the node count before and after loading 10,000 names is equal | 00 |
| N2 | Import scripts with source and licence on every row; no-derivative files kept unmodified | each row has a source; a changed ND file fails the import check | N1 |
| N3 | The first vocabularies: IFC 4.3, Uniclass, OSM tags, designations, ETIM, Wikidata aliases | counts reported per source; twenty sample routes checked by the evaluator | N2 |
| N4 | Tier 1 (exact) and tier 2 (fuzzy, built at build time, in a worker) | under 3 ms on a mid-range phone, measured (after spec 03); under 1 ms here | N1 |
| N5 | Routing to the nearest real node; "nearest real node" said | "bridge bearing", "culvert", "W14", "C30/37", "IfcBeam" each route or say the nearest | N3 |
| N6 | Constitution C14 enforced: the names test in the gate | a name made to count as a node fails the gate | N1 |
| N7 | Tier 3 (meaning), lazy, fused by rank; measured on devices before default | latency and size measured on an iPhone and a mid-range Android | N4, spec 03 |
| N8 | The search questions set grows from what people type (a log the user may turn off) | the set holds 100 questions with answers; all in the first three | N5 |
