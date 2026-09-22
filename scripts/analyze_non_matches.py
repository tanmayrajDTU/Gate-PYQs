import zipfile
import json
import re
import html
from collections import Counter

def extract_pure_text(s):
    if not s: return ''
    s = html.unescape(s)
    s = re.sub(r'<[^>]+>', ' ', s)
    s = s.replace('\\(', ' ').replace('\\)', ' ').replace('\\[', ' ').replace('\\]', ' ').replace('$', ' ')
    return re.sub(r'[^a-z0-9]+', ' ', s.lower()).strip()

def fp(b, opts):
    b_txt = extract_pure_text(b)
    o_txt = ' '.join(extract_pure_text(o.get('html', '') if isinstance(o, dict) else str(o)) for o in (opts or []))
    f = (b_txt + ' ' + o_txt).strip()
    return f[:80] if len(f) >= 15 else f

with open('data/questions.json', 'r', encoding='utf-8') as f:
    gate_fps = {fp(q['bodyHtml'], q['options']) for q in json.load(f)}

with zipfile.ZipFile('scripts/practice data.zip', 'r') as z:
    files = [n for n in z.namelist() if n.startswith('data/questions/') and n.endswith('.json')]
    non_matches = []
    years = Counter()
    branches = Counter()
    exams = Counter()
    for f in files:
        for item in json.loads(z.read(f).decode('utf-8')):
            fprint = fp(item.get('text', ''), item.get('options'))
            if fprint not in gate_fps:
                non_matches.append(item)
                years[item.get('year')] += 1
                branches[item.get('branch')] += 1
                exams[item.get('exam')] += 1
                
    print(f"Total non-matching in data/questions: {len(non_matches)}")
    print(f"Exams: {dict(exams)}")
    print(f"Branches: {dict(branches)}")
    print(f"Years: {dict(sorted(years.items(), key=lambda x: str(x[0])))}")
    print("\nSamples:")
    for item in non_matches[:6]:
        print(f"Exam: {item.get('exam')}, Year: {item.get('year')}, Branch: {item.get('branch')}, Subject: {item.get('subject')}, Topic: {item.get('topic')}")
        print(f"  Title: {item.get('title')}")
        text_snip = item.get('text', '')[:100].replace('\n', ' ')
        print(f"  Text: {text_snip}")
        print()
