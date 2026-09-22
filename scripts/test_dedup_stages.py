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
    # remove images markdown / urls
    s = re.sub(r'https?://\S+', '', s)
    s = re.sub(r'[^a-z0-9]+', ' ', s.lower())
    return ' '.join(s.split())

def get_tokens(s):
    return set(clean_text(s).split())

def options_fingerprint(options):
    if not options: return ""
    cleaned = []
    for o in options:
        h = o.get('html', '') if isinstance(o, dict) else str(o)
        t = clean_text(h)
        if t: cleaned.append(t)
    cleaned.sort()
    return "||".join(cleaned)

print("Loading existing datasets...")
with open('data/questions.json', 'r', encoding='utf-8') as f:
    gate_data = json.load(f)

with open('data/other-questions.json', 'r', encoding='utf-8') as f:
    other_data = json.load(f)

# Build indices of existing questions
# 1. Exact text prefix index (first 80 chars of clean text)
# 2. Options fingerprint index (if >= 2 options)
# 3. 10-word shingle index for fuzzy matches

existing_prefixes = {}
existing_opt_fps = {}
existing_shingles = defaultdict(list)

def register_existing(q, source):
    qid = f"{source}:{q['id']}"
    text = clean_text(q.get('bodyHtml', ''))
    tokens = text.split()
    if len(tokens) >= 5:
        prefix = ' '.join(tokens[:12])
        existing_prefixes[prefix] = qid
        # shingles of 6 words
        for i in range(min(5, max(1, len(tokens) - 5))):
            shingle = ' '.join(tokens[i:i+6])
            existing_shingles[shingle].append(qid)
            
    opt_fp = options_fingerprint(q.get('options'))
    if opt_fp and len(opt_fp) > 20:
        existing_opt_fps[opt_fp] = qid

for q in gate_data:
    register_existing(q, 'GATE')

for q in other_data:
    register_existing(q, 'OTHER')

print(f"Registered {len(existing_prefixes)} text prefixes, {len(existing_opt_fps)} option fingerprints, {len(existing_shingles)} shingles.")

# Test practice questions
with zipfile.ZipFile('scripts/practice data.zip', 'r') as z:
    p_files = [n for n in z.namelist() if n.startswith('data/practice/questions/') and n.endswith('.json')]
    total = 0
    dup_prefix = 0
    dup_options = 0
    dup_shingle = 0
    internal_dups = 0
    
    seen_prefixes = {}
    seen_opt_fps = {}
    
    accepted = []
    
    for f in p_files:
        items = json.loads(z.read(f).decode('utf-8'))
        for item in items:
            total += 1
            text = clean_text(item.get('text', ''))
            tokens = text.split()
            prefix = ' '.join(tokens[:12]) if len(tokens) >= 5 else text
            opt_fp = options_fingerprint(item.get('options'))
            
            # Check internal duplicates within practice bank
            if prefix and prefix in seen_prefixes:
                internal_dups += 1
                continue
            if opt_fp and len(opt_fp) > 25 and opt_fp in seen_opt_fps:
                internal_dups += 1
                continue
                
            # Check against existing GATE and Other
            if prefix and prefix in existing_prefixes:
                dup_prefix += 1
                continue
            if opt_fp and len(opt_fp) > 25 and opt_fp in existing_opt_fps:
                dup_options += 1
                continue
                
            # Check shingle overlap if text is substantial
            is_shingle_dup = False
            if len(tokens) >= 8:
                for i in range(min(3, len(tokens) - 5)):
                    shingle = ' '.join(tokens[i:i+6])
                    if shingle in existing_shingles:
                        is_shingle_dup = True
                        break
            if is_shingle_dup:
                dup_shingle += 1
                continue
                
            seen_prefixes[prefix] = item['id']
            if opt_fp and len(opt_fp) > 25:
                seen_opt_fps[opt_fp] = item['id']
            accepted.append(item)
            
    print(f"\nTotal scanned: {total}")
    print(f"Internal duplicates dropped: {internal_dups}")
    print(f"Duplicates by text prefix: {dup_prefix}")
    print(f"Duplicates by options fingerprint: {dup_options}")
    print(f"Duplicates by 6-word shingle: {dup_shingle}")
    print(f"Total dropped: {internal_dups + dup_prefix + dup_options + dup_shingle}")
    print(f"Accepted unique practice questions: {len(accepted)}")
