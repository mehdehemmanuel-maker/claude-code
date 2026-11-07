# 0007. B-rep is the truth; implicit fields are a check layer and a branch

Date: 2026-10-31. State: accepted (proposed to the user with the plan).

## Context

Implicit (signed-distance) modelling never fails topologically and makes lattices and blends easily, but has no exact faces and no exact STEP.

## Options

1. Move to implicit modelling
2. Keep B-rep (OpenCascade) as the truth for standard parts and STEP; use signed distance for fast checks (wall, room) and for lattices and topology optimisation output, meshed and labelled approximate

## Choice

The second.

## The assumption it rests on

That exact faces and STEP matter for real parts, and that Parasolid's own persistent implicit objects are still "future" (CIMdata, 2026), so no kernel yet unites them.

## When to test it again

When an open kernel carries implicit bodies with exact export.
