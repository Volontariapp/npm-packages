import jq
import sys
import json
import os

# Read current package info to build graph
packages_info = {}
packages_root = 'packages'

for pkg_dir in os.listdir(packages_root):
    pkg_path = os.path.join(packages_root, pkg_dir)
    pkg_json_path = os.path.join(pkg_path, 'package.json')
    if os.path.isdir(pkg_path) and os.path.exists(pkg_json_path):
        with open(pkg_json_path, 'r') as f:
            data = json.load(f)
            packages_info[data['name']] = {
                'dir': pkg_dir,
                'deps': data.get('dependencies', {}),
                'devDeps': data.get('devDependencies', {})
            }

def resolve_deps(pkg_names, visited=None):
    if visited is None:
        visited = set()
    
    result = []
    
    for name in pkg_names:
        if name in visited or name not in packages_info:
            continue
            
        visited.add(name)
        info = packages_info[name]
        
        # Get all workspace dependencies
        ws_deps = [d for d, v in {**info['deps'], **info['devDeps']}.items() if d in packages_info]
        
        # Resolve dependencies first (for topological sort)
        child_results = resolve_deps(ws_deps, visited)
        result.extend(child_results)
        result.append(info['dir'])
        
    return result

input_pkgs_folders = json.loads(sys.stdin.read() or '[]')
# Map folder names back to package names
folder_to_name = {v['dir']: k for k, v in packages_info.items()}
input_pkg_names = [folder_to_name[f] for f in input_pkgs_folders if f in folder_to_name]

# Resolve and sort
final_dirs = []
seen = set()
for dir_name in resolve_deps(input_pkg_names):
    if dir_name not in seen:
        final_dirs.append(dir_name)
        seen.add(dir_name)

print(json.dumps(final_dirs))
