# Spec 00, the structure: what it shall do

The user's words (2026-10-31): "how do we structure this so we don't mess shit up forget shit or you know start doing
circles or just tripping"; earlier: "don't lie again it hurt my feelings"; "stop anything past two minutes"; "test what
changed, not everything".

- **S-R1.** THE SYSTEM SHALL hold its rules in `plan/CONSTITUTION.md`, each with the check that enforces it, and say
  which rules have no check yet. *(don't forget)*
- **S-R2.** WHEN a feature is begun, THE SYSTEM SHALL have a spec for it (requirements traced to the user's words, a
  design naming the owners it extends, tasks that start failing), and a task SHALL become passing only when its check
  passes, judged by an evaluator that did not build it. *(don't call it done when it is not)*
- **S-R3.** WHEN a choice is made between options, THE SYSTEM SHALL record it (options, choice, the assumption under it,
  when to test it again); and BEFORE a settled question is reopened, the record SHALL be found and cited. *(don't go in
  circles)*
- **S-R4.** THE SYSTEM SHALL keep fixed evaluation sets (the AI, interfaces, real products, search) that are run after
  the changes they measure and are never tuned to pass. *(measure what is cared about)*
- **S-R5.** THE SYSTEM SHALL keep `PROGRESS.md`: the spec in hand, the last commit that passed the gate, the next three
  tasks, what blocks; rewritten at the end of each session. *(pick up where it was left)*
- **S-R6.** THE SYSTEM SHALL refuse, by hooks rather than by memory:
  - a push of a commit the gate has not passed;
  - a change past its task's budget without a decision record;
  - a measured number added to `REALITY.md` or `PROGRESS.md` without the command it came from;
  - and SHALL stop work on a task after three failed checks, or a run past two minutes, asking whether a pipeline is
    missing. *(don't trip; don't lie)*
- **S-R7.** THE SYSTEM SHALL check that numbers carry their source or label, that no key is in the repo, and that no
  placeholder figure is in the data. *(no mocks, no guessing)*
