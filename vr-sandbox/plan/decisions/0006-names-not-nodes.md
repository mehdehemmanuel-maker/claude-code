# 0006. A names index apart from the node library

Date: 2026-10-31. State: accepted (proposed to the user with the plan).

## Context

The user asked to populate the library with names and subcategories that help search, "but don't make those count".

## Options

1. Add names as entries of an existing library
2. A separate index (`src/data/names/`) whose entries route to nodes and are never counted as nodes, held by a test

## Choice

The second (spec 02).

## The assumption it rests on

That a node is what runs, and anything else that is counted as one inflates the library and misleads.

## When to test it again

Never, unless the user changes what counts.
