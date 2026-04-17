import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

def get_git_files_hash(directory):
    """Calculates a hash of all git-tracked files in a directory."""
    try:
        # Use git ls-files to get all tracked files and their hashes (fast)
        result = subprocess.run(
            ['git', 'ls-files', '-s', directory],
            capture_output=True, text=True, check=True
        )
        if not result.stdout:
            # Fallback for non-git environments or untracked files
            m = hashlib.sha1()
            for root, _, files in os.walk(directory):
                for f in sorted(files):
                    if 'node_modules' in root or '.dist' in root: continue
                    p = Path(root) / f
                    m.update(p.read_bytes())
            return m.hexdigest()
        
        return hashlib.sha1(result.stdout.encode()).hexdigest()
    except Exception:
        return "none"

def get_monorepo_graph(root_dir):
    """Builds a dependency graph of all packages."""
    packages = {}
    pkg_dirs = [d for d in (root_dir / 'packages').iterdir() if d.is_dir() and (d / 'package.json').exists()]
    
    for d in pkg_dirs:
        with open(d / 'package.json') as f:
            data = json.load(f)
            pkg_name = data['name']
            all_deps = {**data.get('dependencies', {}), **data.get('devDependencies', {}), **data.get('peerDependencies', {})}
            internal_deps = [name for name, ver in all_deps.items() if ver.startswith('workspace:')]
            packages[pkg_name] = {
                'name': pkg_name,
                'dir': d.name,
                'path': d,
                'deps': internal_deps,
                'content_hash': get_git_files_hash(str(d))
            }
    return packages

def get_dirty_packages():
    """Identifies packages with actual git changes compared to main."""
    try:
        # Detect base branch from GitHub env or fallback
        base = os.environ.get('GITHUB_BASE_REF') or os.environ.get('GITHUB_DEFAULT_BRANCH') or 'main'
        
        # Try to find the remote base
        remote_base = None
        for candidate in [f"origin/{base}", f"origin/main", f"origin/master", base]:
            check = subprocess.run(['git', 'rev-parse', '--verify', candidate], capture_output=True)
            if check.returncode == 0:
                remote_base = candidate
                break
        
        if not remote_base:
            # Last resort: diff against HEAD^
            remote_base = "HEAD^"

        print(f"DEBUG: Comparing against {remote_base}", file=sys.stderr)
        
        # Build the diff command
        # Triple dot diff (common ancestor)
        diff_cmd = ['git', 'diff', '--name-only', f"{remote_base}...HEAD"]
        result = subprocess.run(diff_cmd, capture_output=True, text=True)
        
        if not result.stdout.strip():
            # Fallback to simple diff if triple dot failed or empty
            diff_cmd = ['git', 'diff', '--name-only', remote_base, 'HEAD']
            result = subprocess.run(diff_cmd, capture_output=True, text=True)

        changed_files = result.stdout.splitlines()
        print(f"DEBUG: {len(changed_files)} files changed in git", file=sys.stderr)
        
        dirty = set()
        for f in changed_files:
            # Skip documentation and metadata for dirty detection
            if any(f.endswith(x) for x in ['CHANGELOG.md', 'README.md', '.gitignore']):
                continue
            
            if f.startswith('packages/'):
                pkg_dir = f.split('/')[1]
                dirty.add(pkg_dir)
            else:
                # Add root files as they might impact everything (e.g. yarn.lock)
                dirty.add(f)
        
        print(f"DEBUG: Dirty set: {dirty}", file=sys.stderr)
        return dirty
    except Exception:
        return set()

def calculate_recursive_hashes(packages, dirty_set):
    """Calculates final hashes and identifies impacted packages."""
    final_hashes = {}
    reasons = {}
    impacted = set()
    
    def get_final_hash(name):
        if name in final_hashes: return final_hashes[name], name in impacted
        
        pkg = packages[name]
        is_dirty = pkg['dir'] in dirty_set
        
        m = hashlib.sha1()
        m.update(pkg['content_hash'].encode())
        
        # Initial reason
        if is_dirty:
            reasons[name] = "Content change (Git Dirty)"
            impacted.add(name)
        else:
            reasons[name] = "No changes detected"
        
        # Recursively add internal dependencies hashes
        for dep in sorted(pkg['deps']):
            if dep in packages:
                dep_hash, dep_impacted = get_final_hash(dep)
                # If content didn't change but a dep did, mark it
                if dep_impacted:
                    impacted.add(name)
                    if not is_dirty:
                        reasons[name] = f"Dependency {dep} is dirty"
        
        final_hashes[name] = m.hexdigest()
        return final_hashes[name], name in impacted

    for name in packages:
        get_final_hash(name)
        
    return final_hashes, reasons, impacted

def check_registry(name, version):
    """Checks if a specific version already exists on NPM."""
    full_spec = f"{name}@{version}"
    try:
        result = subprocess.run(['npm', 'view', full_spec, 'version'], capture_output=True, text=True)
        return result.returncode == 0 and result.stdout.strip() == version
    except Exception:
        return False

def main():
    root_dir = Path.cwd()
    graph = get_monorepo_graph(root_dir)
    dirty_set = get_dirty_packages()
    hashes, reasons, impacted = calculate_recursive_hashes(graph, dirty_set)
    
    output = []
    for name, h in hashes.items():
        with open(graph[name]['path'] / 'package.json') as f:
            v_base = json.load(f)['version'].split('-')[0]
        
        snapshot_version = f"{v_base}-snapshot.{h}"
        exists = check_registry(name, snapshot_version)
        
        # CRITICAL: Only BUILD if it is IMPACTED and NOT deployed
        is_impacted = name in impacted
        action = 'BUILD' if (is_impacted and not exists) else 'SKIP'
        
        reason = reasons[name] if is_impacted else "Skipped (No changes in graph)"
        if exists: reason = f"Already deployed as {snapshot_version}"

        print(f"DECISION: {name} -> {action} ({reason})", file=sys.stderr)

        output.append({
            'name': name,
            'id': graph[name]['dir'],
            'hash': h,
            'version': snapshot_version,
            'deployed': exists,
            'action': action,
            'reason': reason
        })
    
    print(json.dumps(output, indent=2))

if __name__ == "__main__":
    main()
