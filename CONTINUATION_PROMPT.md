# Continue Together from the integrated default branch

Repository: https://github.com/h55n/together
Canonical branch: `build/amaya-bay-v1`.

The October 1 integration combines the coastal playtest branch, the recovery branch through `77646da`, and audit-hardening history through `c3dc06d`. Preserve the integrated source; do not restore an earlier branch snapshot over it.

Start with `git status --short`, `git fetch origin --prune`, then update the clean default branch with `git pull --ff-only`. Preserve uncommitted work before changing branches. Check the actual HEAD; historical CI and media evidence apply to their recorded commits.

Read:
- `docs/PRD.md` for product requirements.
- `PROJECT_STATE.json` and `docs/MERGE_CLEANUP_2026_10_01.md` for integration state.
- `docs/PLAYTEST_STATE_2026_09_30.md` for the previous playtest milestone and unfinished release work.
- `docs/KNOWN_LIMITATIONS.md`, `docs/ASSET_REQUIREMENTS.md` and `docs/DEVELOPMENT.md`.

Run `pnpm verify` and relevant browser checks before publishing changes. Local development requires `ALLOW_DEV_AUTH=true`; production uses Supabase authentication and server-owned TURN credentials. Follow `.env.example` and development documentation.

Continue reference-quality world and character presentation, bounded cold streaming and draw submissions, normal-speed world/venue acceptance, gameplay balancing, physical WebGPU/controller/device checks, and production Supabase/TURN/network soak. Do not claim release completion or 1080p performance from development screenshots or automated CI alone.

Keep generated review media and local runtime state excluded from Git. Publish verified milestones without force pushing. Obsolete implementations and removed sample files remain recoverable in Git history.
