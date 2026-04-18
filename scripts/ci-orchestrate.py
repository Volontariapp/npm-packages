#!/usr/bin/env python3
"""
ci-orchestrate.py — Monorepo CI orchestrator for @volontariapp/npm-packages.

Detection triggers (per package):
  - packages/<pkg>/package.json changed  → DIRTY
  - packages/<pkg>/CHANGELOG.md changed  → DIRTY  (signals release intent)
  - internal dependency is DIRTY/IMPACTED → IMPACTED (recursive propagation)

Output (JSON to stdout):
{
  "has_changes":     true,
  "snapshot_suffix": "snap-a1b2c3d",
  "build_matrix":    ["auth", "logger"],        // flat list for parallel CI jobs
  "publish_order":   ["logger", "auth"],        // topological: deps first
  "packages": [
    {
      "name":             "@volontariapp/auth",
      "id":               "auth",               // directory name under packages/
      "snapshot_version": "1.2.3-snap-a1b2c3d",
      "internal_deps":    ["@volontariapp/logger"],
      "layer":            1,                    // topological depth (0 = no internal deps)
      "action":           "BUILD",              // BUILD | SKIP
      "reason":           "package.json changed"
    }
  ]
}
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from collections import deque
from pathlib import Path
from typing import Any

# ── Trigger files that mark a package as dirty ────────────────────────────────
_DIRTY_TRIGGERS: frozenset[str] = frozenset({"package.json", "CHANGELOG.md"})


# ── Git helpers ───────────────────────────────────────────────────────────────

def _git(*args: str) -> str:
    result = subprocess.run(["git", *args], capture_output=True, text=True)
    return result.stdout.strip() if result.returncode == 0 else ""


def get_commit_sha() -> str:
    sha = os.environ.get("GITHUB_SHA") or _git("rev-parse", "HEAD")
    return sha[:7] if sha else "unknown"


def resolve_base_ref() -> str:
    """Find the best reference to diff against (PR base, origin/main, HEAD^)."""
    sha = _git("rev-parse", "HEAD")
    candidates = [
        os.environ.get("GITHUB_BASE_REF", ""),
        "origin/main",
        "origin/master",
        "main",
        "master",
    ]
    for ref in candidates:
        if not ref:
            continue
        ref_sha = _git("rev-parse", "--verify", ref)
        if ref_sha and ref_sha != sha:
            _log(f"found valid base_ref: {ref} ({ref_sha[:7]})")
            return ref

    _log("no valid remote or main base_ref found (or already on up-to-date main), falling back to HEAD^")
    return "HEAD^"


def get_changed_files(base_ref: str) -> set[str]:
    """Return file paths changed between base_ref and HEAD (3-dot diff)."""
    # 3-dot diff: from common ancestor of base_ref and HEAD, to HEAD.
    # This is perfect for PRs.
    diff_expr = f"{base_ref}...HEAD"
    out = _git("diff", "--name-only", diff_expr)

    if not out:
        # Fallback: simple two-dot diff
        _log(f"3-dot diff ({diff_expr}) empty, trying 2-dot diff ({base_ref}..HEAD)")
        out = _git("diff", "--name-only", base_ref, "HEAD")

    files = set(out.splitlines()) if out else set()
    _log(f"{len(files)} file(s) changed vs {base_ref!r}")
    if files:
        _log(f"changed files: {sorted(files)[:10]}{' ...' if len(files) > 10 else ''}")
    return files


# ── Package graph ─────────────────────────────────────────────────────────────

def build_package_graph(root: Path) -> dict[str, dict[str, Any]]:
    """Parse packages/* into a dict keyed by package name."""
    packages: dict[str, dict[str, Any]] = {}
    pkg_root = root / "packages"
    if not pkg_root.is_dir():
        return packages

    for pkg_dir in sorted(pkg_root.iterdir()):
        manifest = pkg_dir / "package.json"
        if not pkg_dir.is_dir() or not manifest.exists():
            continue

        data: dict[str, Any] = json.loads(manifest.read_text())
        name: str = data["name"]
        all_deps = {
            **data.get("dependencies", {}),
            **data.get("devDependencies", {}),
            **data.get("peerDependencies", {}),
        }
        internal_deps = [k for k, v in all_deps.items() if str(v).startswith("workspace:")]

        packages[name] = {
            "name": name,
            "id": pkg_dir.name,
            "path": pkg_dir,
            "internal_deps": internal_deps,
            "version": data.get("version", "0.0.0").split("-")[0],
        }
    return packages


# ── Dirty detection ───────────────────────────────────────────────────────────

def find_dirty_packages(
    changed_files: set[str],
    packages: dict[str, dict[str, Any]],
) -> dict[str, str]:
    """
    Return {pkg_name: reason} for every package that has a direct change.
    A package is dirty if package.json OR CHANGELOG.md changed under packages/<id>/.
    """
    dir_to_name = {pkg["id"]: name for name, pkg in packages.items()}
    dirty: dict[str, str] = {}

    for path in changed_files:
        parts = path.split("/")
        # Expected shape: packages/<pkg-id>/<file>
        if len(parts) < 3 or parts[0] != "packages":
            continue
        pkg_dir = parts[1]
        trigger_file = parts[-1]
        if trigger_file not in _DIRTY_TRIGGERS:
            continue
        if pkg_dir in dir_to_name:
            name = dir_to_name[pkg_dir]
            # Keep the first (most specific) reason if already dirty
            dirty.setdefault(name, f"{trigger_file} changed")

    return dirty


# ── Impact propagation (BFS upward through reverse-dep graph) ─────────────────

def propagate_impact(
    packages: dict[str, dict[str, Any]],
    dirty: dict[str, str],
) -> dict[str, str]:
    """
    Recursively mark every package that depends (directly or transitively) on a
    dirty package as IMPACTED.

    Returns {pkg_name: reason} for all packages that must be rebuilt.
    """
    # Build reverse dependency index: dep_name → {packages that depend on it}
    reverse_deps: dict[str, set[str]] = {name: set() for name in packages}
    for name, pkg in packages.items():
        for dep in pkg["internal_deps"]:
            if dep in packages:
                reverse_deps[dep].add(name)

    impacted: dict[str, str] = dict(dirty)
    queue: deque[str] = deque(dirty)

    while queue:
        changed = queue.popleft()
        for parent in reverse_deps.get(changed, set()):
            if parent not in impacted:
                impacted[parent] = f"dependency '{changed}' changed"
                queue.append(parent)

    return impacted


# ── Topological sort (Kahn's algorithm) ──────────────────────────────────────

def topological_sort(
    packages: dict[str, dict[str, Any]],
    build_set: set[str],
) -> tuple[list[str], dict[str, int]]:
    """
    Return (ordered_names, layer_map) for packages in build_set.

    ordered_names: dependency-first order (safe for sequential publishing).
    layer_map:     depth from leaves (0 = no internal deps in build_set).

    Considers only edges within build_set (SKIP packages are ignored).
    """
    in_degree: dict[str, int] = {n: 0 for n in build_set}
    # downstream[dep] = set of packages in build_set that depend on dep
    downstream: dict[str, set[str]] = {n: set() for n in build_set}

    for name in build_set:
        for dep in packages[name]["internal_deps"]:
            if dep in build_set:
                in_degree[name] += 1
                downstream[dep].add(name)

    queue: deque[str] = deque(
        sorted(n for n in build_set if in_degree[n] == 0)
    )
    ordered: list[str] = []
    layers: dict[str, int] = {}
    current_layer = 0

    while queue:
        layer_nodes = list(queue)
        queue = deque()
        for name in layer_nodes:
            ordered.append(name)
            layers[name] = current_layer
            for child in sorted(downstream[name]):
                in_degree[child] -= 1
                if in_degree[child] == 0:
                    queue.append(child)
        current_layer += 1

    # Safety net: append remaining nodes if a cycle was detected
    if len(ordered) < len(build_set):
        _log("WARNING: dependency cycle detected — appending remaining nodes")
        for name in sorted(build_set - set(ordered)):
            ordered.append(name)
            layers[name] = current_layer

    return ordered, layers


# ── Logging ───────────────────────────────────────────────────────────────────

def _log(msg: str) -> None:
    print(f"[orchestrate] {msg}", file=sys.stderr)


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    force_all = "--force-all" in sys.argv

    root = Path.cwd()
    sha = get_commit_sha()
    base_ref = resolve_base_ref()
    snapshot_suffix = f"snap-{sha}"

    _log(f"sha={sha}  base={base_ref}  suffix={snapshot_suffix}  force_all={force_all}")

    packages = build_package_graph(root)
    _log(f"{len(packages)} workspace package(s) found")

    if force_all:
        dirty = {name: "force-all" for name in packages}
        _log(f"force-all: marking all {len(dirty)} package(s) as dirty")
    else:
        changed_files = get_changed_files(base_ref)
        dirty = find_dirty_packages(changed_files, packages)
    _log(f"dirty: {sorted(dirty)}")

    impacted = propagate_impact(packages, dirty)
    build_set = set(impacted)
    _log(f"build set ({len(build_set)}): {sorted(build_set)}")

    ordered_names, layers = topological_sort(packages, build_set)

    # Build final package list (in publish order)
    pkg_list: list[dict[str, Any]] = []
    for name in ordered_names:
        pkg = packages[name]
        layer = layers[name]
        reason = impacted.get(name, "no changes")
        snapshot_version = f"{pkg['version']}-snap-{sha}"
        _log(f"  [layer {layer}] {name} → BUILD  ({reason})  version={snapshot_version}")
        pkg_list.append({
            "name": name,
            "id": pkg["id"],
            "snapshot_version": snapshot_version,
            "internal_deps": pkg["internal_deps"],
            "layer": layer,
            "action": "BUILD",
            "reason": reason,
        })

    # id-indexed lists for GitHub Actions outputs
    build_matrix = [p["id"] for p in pkg_list]   # all BUILD ids (parallel jobs)
    publish_order = [p["id"] for p in pkg_list]  # topological order (sequential publish)

    output = {
        "has_changes": bool(build_set),
        "snapshot_suffix": snapshot_suffix,
        "build_matrix": build_matrix,
        "publish_order": publish_order,
        "packages": pkg_list,
    }

    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
