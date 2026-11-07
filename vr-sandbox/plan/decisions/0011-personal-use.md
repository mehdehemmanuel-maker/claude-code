# 0011. Nexus is for one person on three devices; the builder decides technical choices

Date: 2026-11-01. State: accepted (the user's answers to U1, U2, U4, U14, U15).

## Context

The user's words: "1 idk 2 I didn't mean to say Motorola idk what that was maybe I was saying motor something idk 4 a
it's only for me so I have a computer a phone and a oculus 14 idk what that means 15 idk know what those terms mean
there undefined".

## Options

For each question the user was asked: wait for an answer the user does not have, or take the plainest reading of
what was said and let the builder make the technical choices, saying each and keeping each reversible.

## Choice

The second, question by question:

- **Who it is for**: the user alone, on a computer, a phone and an Oculus (Quest). Spec 03 serves a private address,
  not a public site; spec 06 is a web app on the phone, no store app.
- **Hosting (U1)**, proposed by the builder and confirmed with the user when phase 3 starts: the AI relay as a Supabase
  function (already connected to the account), the pages on a free static host behind a private link, HTTPS (the
  headset needs it for VR). A spend cap of $5 a day as a starting guess, which the user can change.
- **Motorola (U2)**: dropped; it was not meant.
- **Cost and carbon (U14)**: asked again in plain words; spec 12 waits with the later work until answered.
- **The short notation (U15)**: a technical choice, so the builder makes it: adopt the short form for the AI's boards
  (measured at 0.556 of the tokens), JSON kept as the stored form and the fallback, switched only after a larger
  reliability test passes (research 30).
- **How questions are asked from now on**: in plain words, no undefined terms; a technical choice the user need not
  make is made by the builder, said, and reversible.

## The assumption it rests on

That the user, who uses Nexus alone on three devices, is better served by working defaults said plainly than by
questions in terms they do not use.

## When to test it again

When phase 3 starts (hosting), and if the user says the short form or any default is wrong.
