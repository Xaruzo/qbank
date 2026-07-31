import json
from pathlib import Path
from graphify.query import query
from graphify.build import build_from_json

# Load extraction
extraction = json.loads(Path('graphify-out/.graphify_extract.json').read_text(encoding='utf-8'))
# Load graph
G = build_from_json(extraction, root='.', directed=False)
# Load analysis
analysis = json.loads(Path('graphify-out/.graphify_analysis.json').read_text(encoding='utf-8'))
communities = {int(k): v for k, v in analysis['communities'].items()}
# Load labels
labels_file = Path('graphify-out/.graphify_labels.json')
if labels_file.exists():
    labels = json.loads(labels_file.read_text(encoding='utf-8'))
    labels = {int(k): v for k, v in labels.items()}
else:
    labels = {}

# Ask a question
result = query(G, "What's the relationship between Math Symbols & Constants and the Math Text Parser?", communities, labels)
print(result)
