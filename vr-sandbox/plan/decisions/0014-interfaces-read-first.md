# 0014. Interfaces read first, from what parts already say; the reading never changes a part

Date: 2026-11-01. State: accepted (by the builder: a technical choice, decision 0011; reversible). Refines 0004.

## Context

Spec 01 (I1 to I3) begins the interface record: one home for what a part offers or asks where it meets another (decision
0004 named `src/nexus/interfaces.ts`). Parts already say much of it in two older forms: ports (`Port`: holes, threads,
pins, a frame, with a face's place and pattern) and old interfaces (`Iface`: a shaft and its bore, studs and their nuts,
a drive, a chain, a mount). Three independent build plans were judged; they agreed the first step is to read, not to
write: every part's design key holds its ports and old interfaces, so anything that wrote a new field onto a part would
change every part's stored key.

## Options

1. Write a new `interfaces` field onto every part, converted from the old forms
2. Read the record from the old forms each time it is asked for, changing nothing; add new forms later beside them

## Choice

The second. `interfacesOf(thing)` in `src/nexus/interfaces.ts` reads every port and old interface of every part in a thing
as one record each: its kind (holes, threads, pins, frame, shaft, bore, an external or internal thread, drive, chain,
face), its sizes in SI, its standard, what kinds it meets, its frame in the thing's own frame where the port gives one
(old interfaces have none yet), and an id. The id is the names from the thing asked down to the part, then its own name;
siblings of one name are told apart by where they stand (mm), two old interfaces of one name on a part by what they go
to, then their size; an id still shared is reported as a clash, never numbered. The record's type lives with its reader
(kits.ts keeps `Port` and `Iface`). Calls go one way: `mate.ts` reads from `interfaces.ts` (the part-placing function
moved there), never the reverse. A node, Interfaces, shows any thing's. The standards' tables the negatives need (I3)
come only from a document actually opened, each row with its source.

## The assumption it rests on

That the old forms say enough to begin with (the gate's corpus: 44 things, 720 interfaces, no id shared), and that an id
by names and places is stable enough between builds (checked against the ids a build in another process wrote).

## When to test it again

When a frame is read from what is drawn (a bore, a shaft: the next step of I2), when a part moves and its id with it, or
when the full sweep over every starter board's things finds an id two things share.
