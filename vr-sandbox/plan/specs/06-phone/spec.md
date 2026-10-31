# Spec 06, Nexus on the phone (the app once called Moosky)

The user's words (2026-10-31): "phone layout colorful iron man Jarvis phone app but named moosky typ of thing".

## Starts from (checked 2026-10-31)

The dashboard on a 390 px phone overflows its top bar (seen in the 2026-10-31 screenshot); the 3D view's controls work
by touch (`view/pad.ts`, tested in a phone-sized browser, not on a phone); the AI answers through the relay.

## Requirements

- **M-R1.** THE SYSTEM SHALL be installable on iPhone and Android phones as an app (a web app first), over the same core.
- **M-R2.** THE SYSTEM SHALL look and move in the JARVIS manner: a dark base; one hue for each mode (cyan to move, amber
  to warn, magenta for time, green for sight); five anchors always there (status, the world, the board, Claude, sight)
  with widgets fanning out of a core and folding back; glass used sparingly; motion of 150 to 300 ms; reduced motion
  respected.
- **M-R3.** WHEN spoken to, THE SYSTEM SHALL take a request to Claude, or a command ("ghost on", "scale ant", "rewind ten
  seconds", "x-ray"), and answer in words and on screen.
- **M-R4.** THE SYSTEM SHALL keep within a frame budget on the phones it targets, measured.
- **M-R5.** THE SYSTEM SHALL carry the name Nexus (the user, 2026-10-31; `QUESTIONS.md` U3).

## Design

- A page of its own (`view/phone.html`, `src/nexus/view/phone.ts`) over the same board, engine and relay; the
  perception ring of spec 04; the AI's panel as the core.
- Voice: the Web Speech API where the browser has it; a small on-device model (Moonshine tiny) where it does not; a
  short command grammar before free words; spoken replies by speech synthesis.
- Install: a manifest and a service worker; on iOS, a sheet that shows "Share, Add to Home Screen".
- Design references: Perception's and Cantina Creative's Iron Man interfaces; Jayse Hansen's HUD breakdowns; *Make It
  So* (Shedroff and Noessel).

## Tasks

| Id | Task | Check | After |
| --- | --- | --- | --- |
| M1 | The name: Nexus (decided 2026-10-31); a clearance search before publishing | the search done | — |
| M2 | The layout, the anchors, the core and the hues | screenshots on an iPhone and an Android phone; the blind check calls it "an Iron Man style assistant" | spec 03 |
| M3 | Voice: requests and commands | ten commands understood out of ten spoken, measured | M2 |
| M4 | Installed on both phones | installed from the address; opens offline to its last board | M2 |
| M5 | Frame budget | measured frame rates recorded | M2 |
| M6 | The phone as a remote for a headset (later) | — | spec 07 |
