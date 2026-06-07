# Kiln Journal — Claude Instructions

## Memory
Project memory lives at `~/.claude/projects/-mnt-c-Users-Owner-kiln-journal/memory/`.
Read `MEMORY.md` there at the start of every session. It indexes the individual files.

**Keep memory current throughout every session — do not wait to be asked.**
After any meaningful decision, design choice, UX pattern, user preference, or architectural
change is settled, write it to the appropriate memory file immediately. The goal is that the
user can clear the context at any time and the next session picks up with full fidelity.

What warrants a memory update:
- A new architectural or data-shape decision is made
- A user preference or feedback is expressed (positive or negative)
- A bug pattern or platform gotcha is discovered and fixed
- A feature area reaches a stable, shipped state
- Any prior memory entry turns out to be wrong or stale — update or remove it

What does NOT need a memory update:
- Routine edits and deploys (already authorized; no need to log every deploy)
- Intermediate drafts or exploratory changes that get reverted
- Anything already derivable from reading the current code

## Deployment
`firebase deploy --only hosting` is pre-authorized. Run it after every meaningful change
without asking. Do not deploy to any other target without explicit approval.

## Decisions
Settled architectural decisions are in `project_decisions.md` in the memory folder.
Read that file before proposing alternatives to anything already listed.
Only re-open a decision if a new constraint surfaces that wasn't considered when it was made.
