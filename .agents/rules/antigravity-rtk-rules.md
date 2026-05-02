# RTK - Rust Token Killer

**Usage**: Token-optimized CLI proxy (60-90% savings on dev operations).

## Commands Reference

| Operation | Command |
|-----------|---------|
| **Files** | `rtk ls`, `rtk read`, `rtk find`, `rtk grep`, `rtk diff` |
| **Git** | `rtk git status`, `rtk git log`, `rtk git diff`, `rtk git add`, `rtk git commit`, `rtk git push`, `rtk git pull` |
| **Tests** | `rtk npm test`, `rtk jest`, `rtk test <cmd>` |
| **Lint** | `rtk lint`, `rtk tsc` |
| **Misc** | `rtk gain` (analytics), `rtk discover` (opportunities), `rtk proxy <cmd>` (raw) |

## Hook-Based Usage

All other commands are automatically rewritten by the Claude Code hook.
Example: `git status` → `rtk git status` (transparent, 0 tokens overhead).

**Important:** the hook only runs on Bash tool calls. For `Read`, `Grep`, and `Glob` built-in tools, use shell commands (`cat`, `rg`, `find`) or call `rtk read`, `rtk grep`, or `rtk find` directly to get compressed output.
