# 0015. The triangle test is the clash rule's: 10.T24 owns it

Date: 2026-11-02. State: accepted (by the builder: a technical choice, decision 0011; reversible).

## Context

The interference rule (`src/nexus/make/rules.ts`, task 10.T24) decides whether two pieces run into each other with the
critic's triangle test, `meshClashes` in `src/nexus/make/critic.ts`. No task named that file, so its faults had no owner:
writing I17's key test found it blind to a bar run into a round shaft (fault D24). Its depth, the measure that tells a
piece passing into another from one resting on it, came out NaN wherever a drawn cylinder has a triangle with no area,
so every such crossing read as resting.

## Options

1. Leave the triangle test unowned and work round it in the rule
2. Give the triangle test to 10.T24, the task that owns the rule it serves

## Choice

The second: `src/nexus/make/critic.ts` joins 10.T24's files in `plan/owners.json`. The rule and the test it rests on are
one concern; a fault in either is the interference task's to mend.

## The assumption it rests on

That the triangle test serves the clash rule above all, so a change made for the rule is judged by the rule's tests. The
critic's other readers of `meshClashes` (its own report of where parts meet) take the same mended depth.

## When to test it again

When another task needs to change the triangle test for its own reading of where parts meet: then it is shared, and the
change is judged by both tasks' tests.
