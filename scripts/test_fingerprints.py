import zipfile
import json
import re
import html
from collections import defaultdict

def extract_pure_text(s):
    if not s:
        return ""
    s = html.unescape(s)
    # Remove HTML tags
    s = re.sub(r'<[^>]+>', ' ', s)
    # Remove latex delimiters
    s = s.replace('\\(', ' ').replace('\\)', ' ')
    s = s.replace('\\[', ' ').replace('\\]', ' ')
    s = s.replace('$', ' ')
    # Lowercase & normalize spaces & strip punctuation
    s = re.sub(r'[^a-z0-9]+', ' ', s.lower()).strip()
    return s

def question_fingerprint(body, options=None):
    body_text = extract_pure_text(body)
    opt_text = ""
    if options:
        opt_parts = []
        for o in options:
            if isinstance(o, dict):
                h = o.get('html', '')
            elif isinstance(o, str):
                h = o
            else:
                h = str(o)
            opt_parts.append(extract_pure_text(h))
        opt_text = " ".join(opt_parts)
    
    # Combined text
    full = (body_text + " " + opt_text).strip()
    # If text is too short, return whatever we have
    return full

print("Loading existing datasets...")
with open('data/questions.json', 'r', encoding='utf-8') as f:
    gate_questions = json.load(f)

with open('data/other-questions.json', 'r', encoding='utf-8') as f:
    other_questions = json.load(f)

# Index existing GATE questions
gate_index = {} # fp_prefix -> list of (id, title)
for q in gate_questions:
    fp = question_fingerprint(q.get('bodyHtml', ''), q.get('options', []))
    if len(fp) >= 15:
        prefix = fp[:80]
        gate_index[prefix] = q['id']

# Index existing Other questions (ISRO, TIFR)
other_index = {}
for q in other_questions:
    fp = question_fingerprint(q.get('bodyHtml', ''), q.get('options', []))
    if len(fp) >= 15:
        prefix = fp[:80]
        other_index[prefix] = q['id']

print(f"Existing Gate indexed: {len(gate_index)}")
print(f"Existing Other indexed: {len(other_index)}")

# Read all zip items
with zipfile.ZipFile('scripts/practice data.zip', 'r') as z:
    for cat in ['data/questions/', 'data/practice/questions/']:
        files = [n for n in z.namelist() if n.startswith(cat) and n.endswith('.json')]
        total = 0
        gate_matches = 0
        other_matches = 0
        internal_dups = 0
        seen_in_cat = set()
        
        for f in files:
            data = json.loads(z.read(f).decode('utf-8'))
            for item in data:
                total += 1
                fp = question_fingerprint(item.get('text', ''), item.get('options') or [])
                prefix = fp[:80] if len(fp) >= 15 else fp
                if prefix in seen_in_cat:
                    internal_dups += 1
                    continue
                seen_in_cat.add(prefix)
                
                if prefix in gate_index:
                    gate_matches += 1
                elif prefix in other_index:
                    other_matches += 1
                    
        print(f"\n--- {cat} ---")
        print(f"Total in files: {total}")
        print(f"Internal duplicates within category: {internal_dups}")
        print(f"Matches existing GATE: {gate_matches}")
        print(f"Matches existing Other (ISRO/TIFR): {other_matches}")
        print(f"Net unique questions: {total - internal_dups - gate_matches - other_matches}")
