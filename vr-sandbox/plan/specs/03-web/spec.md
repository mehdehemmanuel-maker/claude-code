# Spec 03, out of the container: the app on the web

The user's words (2026-10-31): "Okay 1-2" (item 1 of the upgrade proposal: put it on the web).

## Starts from (checked 2026-10-31)

The app is built by Vite (`vite.view.config.ts`) into `dist-view/` and served only in this container (`npm run app`),
with a relay plugin that runs the AI under Node so the key never reaches the page. No real phone, gamepad or headset has
ever opened it. The OpenCascade and Jolt WebAssembly builds are loaded by the pages.

## Requirements

- **W-R1.** THE SYSTEM SHALL serve the app at a public address that a phone and a Quest browser open.
- **W-R2.** THE SYSTEM SHALL run the AI relay as a server function holding the keys; no key SHALL reach a page.
- **W-R3.** THE SYSTEM SHALL serve the WebAssembly with the headers its threaded builds need (cross-origin isolation),
  or fall back to the single-threaded builds and say so.
- **W-R4.** THE SYSTEM SHALL limit the relay's spending (a cap per day the user sets) and refuse past it, saying so.
- **W-R5.** THE SYSTEM SHALL deploy only a commit that passed the gate.

## Design

- Static pages on a host the user chooses (`QUESTIONS.md` U1). Candidates: a static host with functions (one service
  for both), or Supabase (connected to this account) for the relay's function and a static host for the pages.
- The relay: the same `agentBuild` code, as a function; the keys as the host's secrets; a per-day spend counter.
- The deploy: a script that refuses a commit without the gate's stamp (spec 00, S3).

## Tasks

| Id | Task | Check | After |
| --- | --- | --- | --- |
| W1 | The user chooses the host and a spending cap | the answers in `QUESTIONS.md` | the user |
| W2 | The pages deployed with the right headers | the address opens on a phone and a Quest; the Controls board works; screenshots from the devices | W1 |
| W3 | The relay as a function, keys as secrets, the spend cap | Ask Claude answers through it; a request past the cap is refused and says so; no key in any page (scanned) | W1 |
| W4 | Deploy only from a gate-passed commit | a deploy of an unstamped commit is refused | W2, spec 00 S3 |
| W5 | Measured on devices: load time, frame rate on the city board, search latency | numbers recorded in REALITY.md with how measured | W2 |
