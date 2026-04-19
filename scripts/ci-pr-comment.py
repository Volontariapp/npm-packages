#!/usr/bin/env python3
"""
ci-pr-comment.py — Build and post the CI snapshot report as a PR comment.

Generates:
  • A global coverage table (Lines / Functions / Branches) for every BUILD package.
  • Per-package sections with yarn add / yarn up install snippets.
  • A link to the HTML coverage artifact.

Usage:
  python3 scripts/ci-pr-comment.py \
    --plan      <plan.json>         \
    --artifacts <coverage-artifacts-dir> \
    --pr        <pr-number>         \
    --run-id    <github-run-id>     \
    --repo      <owner/repo>
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


# ── Coverage helpers ──────────────────────────────────────────────────────────

def load_coverage(artifacts_dir: Path, pkg_id: str) -> dict[str, float | str] | None:
    """Return coverage totals or None if the summary file is absent."""
    summary = artifacts_dir / f"coverage-summary-{pkg_id}" / "coverage-summary.json"
    if not summary.exists():
        return None
    data = json.loads(summary.read_text())
    total = data.get("total", {})
    return {
        "lines":      total.get("lines",      {}).get("pct", "N/A"),
        "functions":  total.get("functions",  {}).get("pct", "N/A"),
        "branches":   total.get("branches",   {}).get("pct", "N/A"),
        "statements": total.get("statements", {}).get("pct", "N/A"),
    }


def _pct(val: float | str) -> str:
    if isinstance(val, (int, float)):
        return f"{val:.1f}%"
    return str(val)


def _badge(val: float | str) -> str:
    """Return a coverage value with a simple visual indicator."""
    if isinstance(val, (int, float)):
        icon = "🟢" if val >= 80 else ("🟡" if val >= 60 else "🔴")
        return f"{icon} {val:.1f}%"
    return str(val)


# ── Comment builder ───────────────────────────────────────────────────────────

def build_comment(
    plan: dict,
    artifacts_dir: Path,
    run_id: str,
    repo: str,
) -> str:
    artifact_url = f"https://github.com/{repo}/actions/runs/{run_id}#artifacts"
    build_pkgs = [p for p in plan["packages"] if p["action"] == "BUILD"]

    if not build_pkgs:
        return "## CI Snapshot Report\n\nNo packages were published in this run."

    lines: list[str] = [
        "## CI Snapshot Report\n",
        f"> Commit snapshot — all packages tagged `{plan.get('snapshot_suffix', 'snap-?')}`\n",
        "---\n",
        "### Coverage Summary\n",
        "| Package | Lines | Functions | Branches | Snapshot version |",
        "| :------ | ----: | --------: | -------: | :--------------- |",
    ]

    for pkg in build_pkgs:
        cov = load_coverage(artifacts_dir, pkg["id"])
        pkg_cell = f"`{pkg['name']}`"
        ver_cell = f"`{pkg['snapshot_version']}`"
        if cov:
            lines.append(
                f"| {pkg_cell} "
                f"| {_badge(cov['lines'])} "
                f"| {_badge(cov['functions'])} "
                f"| {_badge(cov['branches'])} "
                f"| {ver_cell} |"
            )
        else:
            lines.append(f"| {pkg_cell} | — | — | — | {ver_cell} |")

    lines += [
        f"\n[View full HTML coverage reports]({artifact_url})\n",
        "---\n",
        "### Package Install Snippets\n",
    ]

    for pkg in build_pkgs:
        full = f"{pkg['name']}@{pkg['snapshot_version']}"
        cov = load_coverage(artifacts_dir, pkg["id"])

        lines.append(f"<details>")
        lines.append(f"<summary><strong>{pkg['name']}</strong> — layer {pkg['layer']}</summary>\n")

        if cov:
            lines += [
                "| Metric | Coverage |",
                "| :----- | -------: |",
                f"| Lines | {_badge(cov['lines'])} |",
                f"| Functions | {_badge(cov['functions'])} |",
                f"| Branches | {_badge(cov['branches'])} |",
                f"\n[HTML report]({artifact_url})\n",
            ]

        if pkg["internal_deps"]:
            dep_list = ", ".join(f"`{d}`" for d in pkg["internal_deps"])
            lines.append(f"**Internal dependencies:** {dep_list}\n")

        lines += [
            "**Install**",
            f"```bash\nyarn add {full}\n```",
            "**Upgrade**",
            f"```bash\nyarn up {full}\n```",
            "",
            "</details>\n",
        ]

    return "\n".join(lines)


# ── GitHub comment posting ────────────────────────────────────────────────────

def post_comment(pr_number: int, body: str) -> None:
    result = subprocess.run(
        ["gh", "pr", "comment", str(pr_number), "--body", body],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"gh error: {result.stderr}", file=sys.stderr)
        sys.exit(1)
    print(f"[pr-comment] Posted to PR #{pr_number}")


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Post CI snapshot report to a PR.")
    parser.add_argument("--plan",      required=True, help="Path to ci-orchestrate.py output JSON")
    parser.add_argument("--artifacts", required=True, help="Directory containing coverage-summary-* subdirs")
    parser.add_argument("--pr",        required=True, type=int, dest="pr_number")
    parser.add_argument("--run-id",    required=True)
    parser.add_argument("--repo",      required=True, help="owner/repo slug")
    args = parser.parse_args()

    plan = json.loads(Path(args.plan).read_text())
    artifacts_dir = Path(args.artifacts)

    body = build_comment(plan, artifacts_dir, args.run_id, args.repo)
    post_comment(args.pr_number, body)


if __name__ == "__main__":
    main()
