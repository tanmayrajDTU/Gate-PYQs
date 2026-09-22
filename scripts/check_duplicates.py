import zipfile
import json
import re
import html
from collections import defaultdict

def normalize_text(text):
    if not text:
        return ""
    # Unescape HTML entities
    text = html.unescape(text)
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', ' ', text)
    # Normalize LaTeX math: e.g. $...$ or \(...\)
    text = text.replace('\\(', ' ').replace('\\)', ' ')
    text = text.replace('\\[', ' ').replace('\\]', ' ')
    text = text.replace('$', ' ')
    # Lowercase & strip non-alphanumeric
    text = re.sub(r'[^a-z0-9]', '', text.lower())
    return text

print("Loading existing questions...")
with open('data/questions.json', 'r', encoding='utf-8') as f:
    gate_questions = json.load(f)

with open('data/other-questions.json', 'r', encoding='utf-8') as f:
    other_questions = json.load(f)

print(f"Loaded {len(gate_questions)} GATE questions, {len(other_questions)} other questions.")

gate_fingerprints = {}
for q in gate_questions:
    norm = normalize_text(q.get('bodyHtml', ''))
    if len(norm) >= 25:
        # store first 150 chars or full norm
        gate_fingerprints[norm[:120]] = q['id']

other_fingerprints = {}
for q in other_questions:
    norm = normalize_text(q.get('bodyHtml', ''))
    if len(norm) >= 25:
        other_fingerprints[norm[:120]] = q['id']

print(f"GATE fingerprints: {len(gate_fingerprints)}, Other fingerprints: {len(other_fingerprints)}")

# Now test zip questions
with zipfile.ZipFile('scripts/practice data.zip', 'r') as z:
    for prefix in ['data/questions/', 'data/practice/questions/']:
        files = [n for n in z.namelist() if n.startswith(prefix) and n.endswith('.json')]
        total = 0
        dup_gate = 0
        dup_other = 0
        short_text = 0
        for f in files:
            data = json.loads(z.read(f).decode('utf-8'))
            for item in data:
                total += 1
                norm = normalize_text(item.get('text', ''))
                if len(norm) < 25:
                    short_text += 1
                    continue
                fp = norm[:120]
                if fp in gate_fingerprints:
                    dup_gate += 1
                elif fp in other_fingerprints:
                    dup_other += 1
        print(f"\nPrefix: {prefix}")
        print(f"Total: {total}, Duplicates in GATE: {dup_gate}, Duplicates in Other: {dup_other}, Short text (<25 chars): {short_text}")
        print(f"Potential new: {total - dup_gate - dup_other}")
