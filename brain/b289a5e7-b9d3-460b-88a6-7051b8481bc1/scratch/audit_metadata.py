import json
import re

def get_paths(d, parent=''):
    paths = []
    if isinstance(d, dict):
        for k, v in d.items():
            paths.extend(get_paths(v, f'{parent}.{k}' if parent else k))
    elif isinstance(d, list):
        if not d:
            paths.append(f'{parent}[]')
        else:
            # Add array marker and recurse into first element to see structure
            paths.append(f'{parent}[]')
            paths.extend(get_paths(d[0], f'{parent}[]'))
    else:
        paths.append(parent)
    return list(set(paths))

file_path = 'd:/APP/optavision-app/Oldprojet/Exemple/eventing-France_2025_2026_Ligue_1_J31_Olympique_Marseille_vs_Nice-2026-04-26.txt'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()
    match = re.search(r'(\{.*\})', content, re.DOTALL)
    data = json.loads(match.group(1))

print("### matchInfo ###")
for p in sorted(get_paths(data['matchInfo'])):
    print(p)

print("\n### matchDetails ###")
for p in sorted(get_paths(data['liveData']['matchDetails'])):
    print(p)
