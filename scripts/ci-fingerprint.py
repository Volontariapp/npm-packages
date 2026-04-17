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

def calculate_recursive_hashes(packages):
    """Calculates final hashes by including dependency hashes (propagation)."""
    final_hashes = {}
    
    def get_final_hash(name):
        if name in final_hashes: return final_hashes[name]
        
        pkg = packages[name]
        m = hashlib.sha1()
        m.update(pkg['content_hash'].encode())
        
        # Add yarn.lock hash if it exists for global dependency detection
        lock_path = Path('yarn.lock')
        if lock_path.exists():
            m.update(lock_path.read_bytes())

        # Recursively add internal dependencies hashes
        for dep in sorted(pkg['deps']):
            if dep in packages:
                dep_hash = get_final_hash(dep)
                m.update(dep_hash.encode())
        
        res = m.hexdigest()[:12] # Keep it shorter for version strings
        final_hashes[name] = res
        return res

    for name in packages:
        get_final_hash(name)
        
    return final_hashes

def check_registry(name, version_hash):
    """Checks if a specific snapshot version already exists on NPM."""
    snapshot_version = f"0.0.0-snapshot.{version_hash}"
    full_spec = f"{name}@{snapshot_version}"
    try:
        result = subprocess.run(['npm', 'view', full_spec, 'version'], capture_output=True, text=True)
        return result.returncode == 0 and result.stdout.strip() == snapshot_version
    except Exception:
        return False

def main():
    root_dir = Path.cwd()
    graph = get_monorepo_graph(root_dir)
    hashes = calculate_recursive_hashes(graph)
    
    output = []
    for name, h in hashes.items():
        exists = check_registry(name, h)
        output.append({
            'name': name,
            'id': graph[name]['dir'],
            'hash': h,
            'version': f"0.0.0-snapshot.{h}",
            'deployed': exists,
            'action': 'SKIP' if exists else 'BUILD'
        })
    
    print(json.dumps(output, indent=2))

if __name__ == "__main__":
    main()
