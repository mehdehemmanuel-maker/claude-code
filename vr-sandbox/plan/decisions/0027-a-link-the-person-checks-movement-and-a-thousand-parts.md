# 0027. A link the person checks with, movement in general, and a thousand parts

Date: 2026-11-06. State: accepted (the user, 2026-11-06: "send me the link so I can actually access and see, forget the
blind check for now I'll be the check just allow me to put a pointer somewhere and report something or type to the in
app ai and the in app ai can send you requests", "I want moving joints and don't just code moving joints code movement
in general", "make the builds more able and add more parts matter fact this run I want you to add 1000 new working parts
no mock shit though like really populate the library just populate it with peices and organize it better for
navigation along the way"; every word in `docs/WANTED.md`).

## Context

The app ran only inside the session's container, on a port the person could not reach. The person is now the check
(no blind agent this run), so they need the app on their own phone, a way to point at a spot and say what is wrong,
and a way for the in-app AI to pass on what it cannot do. Nothing in the space moves except the precomputed physics
boards: pieces cannot be held in place or left free, joints are not read from how the operations joined pieces, and
gears do not mesh. The library holds 149 piece families.

## Options

1. A public tunnel to the container's port (refused: the relay holds the model key, and a public URL would spend it
   for anyone who found it)
2. The Pages copy of the app (it has no relay, so no AI, and no way to report)
3. The phone page published as a private page on claude.ai: the in-app AI on the viewer's own Claude account (the
   page's `sample` capability, no key in the page), reports kept in the page's store and sent into this session by the
   Claude Code Remote connector's `send_message`, as the viewer

## Choice

The third, for the link. Movement in general and the parts are built alongside it, by agents in their own worktrees,
merged and gated: a piece frozen or loose, joints read from the operations that joined the pieces (over and through
with a clear fit turn; touch, tight and bolted hold), meshing gears coupled by their tooth ratio, the physics stepped
live in the view so a crank can be dragged round; builds able to do what the AI's forty requests failed on; six trades
of new real parts, each row sourced or labelled typical; every part on an aisle (trade / category) in a catalogue the
app and the AI browse.

## The assumption it rests on

The claude.ai viewer runs the app's bundle as published (its modules, its workers, Jolt's wasm in JavaScript) and grants
`sample`, `db` and the connector to the page's owner. The exact-solids engine (a 23 MB wasm, over the 15 MB a file may
be) is left out of the page, so exact solids and STEP export work only in the app the session serves.

## When to test it again

When the person reports the page does not load or a capability is refused; when a part count is reported, by the probe
that walks the families; when the viewer's file limits change (then the exact-solids engine can go in).

## Consequences

- The person opens one private link on any device. Reports and the AI's requests arrive in this session as messages,
  and are kept in the page's store (read with ArtifactData) if a message does not go through.
- Assist and Auto on the page spend the person's own Claude usage, not the session's key, and its tokens are not
  shown there.
- The dashboard (its own page) is not in the published copy: the artifact's index is the phone page.
