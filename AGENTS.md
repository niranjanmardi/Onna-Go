# Project Rules & Agent Guidelines

## Git Safety Rules
- **NEVER** run `git checkout`, `git clean`, `git reset`, `git push`, or `git add -A` without explicitly asking the user and receiving approval first.
- Only stage and commit explicitly specified files (e.g., `git add path/to/file.tsx`) with clear, descriptive commit messages.
- Do not track or commit build distributions (`frontend/dist`) or local databases (`splitmate.db`, uploads) unless explicitly instructed.

## Design & UI System
- Use clean, minimal, content-first design.
- Max 400px centered forms for auth.
- 48px hairline inputs, 10px radius, labels above, inline errors.
- Both Light and Dark modes are first-class and intentional.
- Avoid heavy shadows, gradients, emojis, or marketing fluff.
- Tabular figures for numbers and financial balances.
