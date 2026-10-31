# 0003. Checks by number first; pictures second

Date: 2026-10-31. State: accepted (proposed to the user with the plan).

## Context

The AI and the evaluator can check a result by measuring it or by looking at a picture of it.

## Options

1. Pictures first (render and ask a model)
2. Numbers first (volume, mass, centre of mass, clearance, interference, joint residuals), pictures as a second check

## Choice

Numbers first.

## The assumption it rests on

BenchCAD (a harness never shown renders scored the same at about half the cost); ModelRift (renders caught nothing that mattered); Spectral Labs (right only within 0.1 %); CADCodeVerify's picture verifier right 64.6 to 68.2 % of the time (`research/01-ai-cad-tools.md`).

## When to test it again

When a newer model is adopted: rerun the AI's evaluation set with and without pictures.
