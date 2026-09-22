import zipfile
import json
import re
import html
from collections import defaultdict

def clean_text(s):
    if not s: return ""
    s = html.unescape(s)
    s = re.sub(r'<[^>]+>', ' ', s)
    s = s.replace('\\(', ' ').replace('\\)', ' ').replace('\\[', ' ').replace('\\]', ' ').replace('$', ' ')
    s = re.sub(r'https?://\S+', '', s)
    s = re.sub(r'[^a-z0-9]+', ' ', s.lower())
    return ' '.join(s.split())

def options_fingerprint(options):
    if not options: return ""
    cleaned = []
    for o in options:
        h = o.get('html', '') if isinstance(o, dict) else str(o)
        t = clean_text(h)
        if t: cleaned.append(t)
    cleaned.sort()
    return "||".join(cleaned)

def full_question_fingerprint(text, options):
    t = clean_text(text)
    opts = options_fingerprint(options)
    return t + (" @@ " + opts if opts else "")

print("Loading existing datasets...")
with open('data/questions.json', 'r', encoding='utf-8') as f:
    gate_data = json.load(f)

with open('data/other-questions.json', 'r', encoding='utf-8') as f:
    other_data = json.load(f)

# Indexing existing questions
# 1. Full question fingerprint (exact match of text + options)
# 2. Text fingerprint (if text >= 35 characters)
# 3. Options fingerprint (if >= 2 distinct non-empty options and len > 20)

existing_full = set()
existing_text = set()
existing_options = set()

def index_q(q):
    b = clean_text(q.get('bodyHtml', ''))
    opts = options_fingerprint(q.get('options'))
    if b:
        existing_text.add(b)
        if len(b) > 60:
            # Also add 50-word prefix if long question
            tokens = b.split()
            if len(tokens) >= 20:
                existing_text.add(' '.join(tokens[:20]))
    if opts and len(opts) > 25:
        existing_options.add(opts)
    if b and opts:
        existing_full.add(b + " @@ " + opts)

for q in gate_data:
    index_q(q)

for q in other_data:
    index_q(q)

print(f"Indexed existing: {len(existing_text)} texts, {len(existing_options)} options")

# Now scan zip
with zipfile.ZipFile('scripts/practice data.zip', 'r') as z:
    p_files = [n for n in z.namelist() if n.startswith('data/practice/questions/') and n.endswith('.json')]
    total = 0
    internal_dups = 0
    dup_existing = 0
    
    seen_text = set()
    seen_options = set()
    
    accepted = []
    duplicates_sample = []
    
    for f in p_files:
        items = json.loads(z.read(f).decode('utf-8'))
        for item in items:
            total += 1
            b = clean_text(item.get('text', ''))
            opts = options_fingerprint(item.get('options'))
            tokens = b.split()
            prefix20 = ' '.join(tokens[:20]) if len(tokens) >= 20 else b
            
            # Check internal duplicates within practice bank
            if (b and b in seen_text) or (opts and len(opts) > 25 and opts in seen_options):
                internal_dups += 1
                continue
                
            # Check against existing
            is_dup = False
            match_reason = ""
            if b and b in existing_text:
                is_dup = True
                match_reason = "exact_text"
            elif len(tokens) >= 20 and prefix20 in existing_text:
                is_dup = True
                match_reason = "prefix20_text"
            elif opts and len(opts) > 25 and opts in existing_options:
                is_dup = True
                match_reason = "exact_options"
                
            if is_dup:
                dup_existing += 1
                if len(duplicates_sample) < 5:
                    duplicates_sample.append((match_reason, item.get('title'), b[:80]))
                continue
                
            if b: seen_text.add(b)
            if opts and len(opts) > 25: seen_options.add(opts)
            accepted.append(item)
            
    print(f"\nTotal practice questions: {total}")
    print(f"Internal duplicates removed: {internal_dups}")
    print(f"Duplicates of existing questions removed: {dup_existing}")
    print(f"Total dropped: {internal_dups + dup_existing}")
    print(f"Accepted unique practice questions: {len(accepted)}")
    print("\nSample detected duplicates:")
    for r, title, snip in duplicates_sample:
        print(f"  [{r}] {title} -> {snip}")
