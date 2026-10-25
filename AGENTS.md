# Project Rules & Agent Guidelines

## Git & Workflow Safety Rules
- **NEVER** run `git push`, `commit`, `checkout`, `clean`, `reset`, or `add -A` without asking the user first.
- **NEVER** modify or delete `splitmate.db` or local database files directly unless explicitly instructed.
- **STOP** after each step. Present results and await approval before proceeding to the next step.
- Only stage explicitly specified files (e.g., `git add path/to/file.tsx`) with clear, descriptive commit messages when asked to commit.
- Do not track or commit build distributions (`frontend/dist`) or local databases (`splitmate.db`, uploads).

## Design & UI System
- Use clean, minimal, content-first design.
- Max 400px centered forms for auth.
- 48px hairline inputs, 10px radius, labels above, inline errors.
- Both Light and Dark modes are first-class and intentional.
- Avoid heavy shadows, gradients, emojis, or marketing fluff.
- Tabular figures for numbers and financial balances.
- Skeleton loaders instead of spinners.
- Empty states: one line plus one button.
