# 0023. The phone page is a chat that builds: say it, see it built

Date: 2026-11-05. State: accepted (the user, 2026-11-03: "make this app easily accessible right away for me on mobile
with a vibe engineer interface kind of like typical vibe spaces but for cad").

## Context

On a phone the dashboard (`view/index.html`) is three columns, a board of wires and a strip of gauges: it overflows and
cannot be worked by a thumb (spec 06 says so of 2026-10-31). Spec 06 planned a page of its own, `view/phone.html`, in
the JARVIS manner: five anchors round a core, widgets fanning out, voice. The user now asks for what the vibe-coding
tools do, for CAD: a chat in which you say what you want and watch it made.

## Options

1. Make the dashboard fold to one column on a phone
2. Spec 06's page as designed: anchors, a core, fanning widgets, then voice
3. A page whose whole surface is the thing being built, with a chat at its foot that drives the AI already in the app
   (`nexus/agent.ts` through the relay), each step streamed back with the board as it stands so the thing grows as
   Claude works; the piece boards a tap away with no AI; the board as a list when asked for, the dashboard a press away

## Choice

The third: `view/vibe.html` and `src/nexus/view/vibe.ts`. A phone opening the dashboard is sent there (`?full` keeps
the dashboard). The relay streams a line of JSON per step (`stream: true`), the board after each build or change with
it; nothing about the key changes (it stays under Node). A board with no "Show in space" node shows what it ends with.
Spec 06's M2 (anchors, hues) and M3 (voice) stay open: this is the page they are built on, not their replacement.

## The assumption it rests on

That a person on a phone wants to see the thing and say what to change, not to wire nodes; and that the board is
still there, one press away, for whoever wants to look inside.

## When to test it again

When the user asks to wire or edit nodes on the phone itself, or when voice (M3) is built: then the board's list and
the chat may need to become one.
