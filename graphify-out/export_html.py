import sys, json
from graphify.export import to_html, json_graph
from graphify.build import build_from_json
from pathlib import Path

# Load the existing extraction
extraction = json.loads(Path('graphify-out/.graphify_extract.json').read_text(encoding='utf-8'))
# Build the graph
G = build_from_json(extraction, root='.', directed=False)
# Load communities from analysis
analysis = json.loads(Path('graphify-out/.graphify_analysis.json').read_text(encoding='utf-8'))
communities = {int(k): v for k, v in analysis['communities'].items()}
# Load labels from .graphify_labels.json if available
labels = {}
labels_file = Path('graphify-out/.graphify_labels.json')
if labels_file.exists():
    labels = json.loads(labels_file.read_text(encoding='utf-8'))
    labels = {int(k): v for k, v in labels.items()}

# Generate HTML
to_html(G, communities, output_path=Path('graphify-out/graph.html'))
print('HTML exported successfully to graphify-out/graph.html')

