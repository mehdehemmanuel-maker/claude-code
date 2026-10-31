# 0005. No learned model in the running path for geometry

Date: 2026-10-31. State: accepted (proposed to the user with the plan).

## Context

Learned models (BrepGen, CAD-Recode, BRepNet, UV-Net, AutoMate's SB-GCN) generate, recognise or rank geometry.

## Options

1. Use them to make parts
2. Use them only to suggest (rank candidate mates, recognise features on imported STEP), with rules deciding; and their datasets as evaluation sets

## Choice

The second.

## The assumption it rests on

That none makes exact, standard-true, sourced parts, which the library law and "no guessing" require (`research/02-topology-mating.md`).

## When to test it again

When a model is shown to produce standard-true parts on our evaluation set.
