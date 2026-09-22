import zipfile
import json
import re
import html
from collections import Counter, defaultdict

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

def slugify(text):
    if not text: return "general"
    s = text.lower().strip()
    s = re.sub(r'[^a-z0-9]+', '_', s).strip('_')
    return s

print("Loading existing datasets...")
with open('data/questions.json', 'r', encoding='utf-8') as f:
    gate_data = json.load(f)

with open('data/other-questions.json', 'r', encoding='utf-8') as f:
    other_data = json.load(f)

existing_text = set()
existing_prefixes = set()
existing_options = set()

for q in gate_data + other_data:
    b = clean_text(q.get('bodyHtml', ''))
    if b:
        existing_text.add(b)
        tokens = b.split()
        if len(tokens) >= 15:
            existing_prefixes.add(' '.join(tokens[:15]))
    opts = options_fingerprint(q.get('options'))
    if opts and len(opts) > 20:
        existing_options.add(opts)

print(f"Indexed {len(existing_text)} existing texts, {len(existing_prefixes)} prefixes, {len(existing_options)} options fingerprints.")

# Now parse and convert practice questions
imported_questions = []
seen_text = set()
seen_prefixes = set()
seen_options = set()

stats = {
    'total_scanned': 0,
    'dropped_internal_dup': 0,
    'dropped_existing_gate_other': 0,
    'by_subject': Counter(),
    'by_type': Counter(),
    'by_exam': Counter(),
}

with zipfile.ZipFile('scripts/practice data.zip', 'r') as z:
    # 1. Practice questions
    p_files = [n for n in z.namelist() if n.startswith('data/practice/questions/') and n.endswith('.json')]
    
    # Sort files to ensure deterministic processing
    p_files.sort()
    
    topic_counters = defaultdict(int)
    
    for f in p_files:
        items = json.loads(z.read(f).decode('utf-8'))
        for item in items:
            stats['total_scanned'] += 1
            b = clean_text(item.get('text', ''))
            tokens = b.split()
            prefix = ' '.join(tokens[:15]) if len(tokens) >= 15 else b
            opts = options_fingerprint(item.get('options'))
            
            # Check internal duplicates
            if (b and b in seen_text) or (prefix and prefix in seen_prefixes) or (opts and len(opts) > 20 and opts in seen_options):
                stats['dropped_internal_dup'] += 1
                continue
                
            # Check existing duplicates (GATE or ISRO/TIFR)
            if (b and b in existing_text) or (prefix and prefix in existing_prefixes) or (opts and len(opts) > 20 and opts in existing_options):
                stats['dropped_existing_gate_other'] += 1
                continue
                
            if b: seen_text.add(b)
            if prefix: seen_prefixes.add(prefix)
            if opts and len(opts) > 20: seen_options.add(opts)
            
            # Process question
            qtype = (item.get('type') or 'MCQ').lower()
            subj = item.get('subject') or 'General'
            topic = item.get('topic') or 'General'
            
            # Map answer
            raw_ans = item.get('correctAnswer')
            ans_str = None
            if qtype == 'mcq':
                if isinstance(raw_ans, int) and 0 <= raw_ans < 6:
                    ans_str = ['A', 'B', 'C', 'D', 'E', 'F'][raw_ans]
                elif isinstance(raw_ans, str):
                    ans_str = raw_ans.strip()
            elif qtype == 'msq':
                if isinstance(raw_ans, list):
                    labels = [(['A', 'B', 'C', 'D', 'E', 'F'][i] if isinstance(i, int) and 0 <= i < 6 else str(i)) for i in raw_ans]
                    ans_str = ';'.join(labels)
                elif isinstance(raw_ans, str):
                    ans_str = raw_ans.strip()
            elif qtype == 'nat':
                if isinstance(raw_ans, dict):
                    mn = raw_ans.get('min')
                    mx = raw_ans.get('max')
                    if mn is not None and mx is not None:
                        if mn == mx:
                            ans_str = str(mn)
                        else:
                            ans_str = f"{mn}:{mx}"
                    elif mn is not None:
                        ans_str = str(mn)
                elif raw_ans is not None:
                    ans_str = str(raw_ans)
                    
            # Map options
            opts_list = []
            if item.get('options'):
                for idx, opt in enumerate(item['options']):
                    label = ['A', 'B', 'C', 'D', 'E', 'F', 'G'][idx] if idx < 7 else str(idx + 1)
                    html_content = opt.get('html', '') if isinstance(opt, dict) else str(opt)
                    opts_list.append({
                        'label': label,
                        'html': html_content
                    })
                    
            topic_counters[f"{subj}:{topic}"] += 1
            t_idx = topic_counters[f"{subj}:{topic}"]
            
            tags = ["practice", slugify(subj)]
            if item.get('difficulty'):
                tags.append(str(item['difficulty']).lower())
                
            q_obj = {
                'id': f"kg_prac_{item['id']}",
                'number': f"PRAC-{item.get('number', item['id'][:8])}",
                'title': item.get('title') or f"Practice - {subj} ({topic})",
                'volume': 1,
                'subject': subj,
                'subjectId': f"other_{slugify(subj)}",
                'topic': topic,
                'topicId': f"other_{slugify(subj)}_{slugify(topic)}",
                'topicNumber': f"P.{t_idx}",
                'year': None,
                'exam': "Knowledge Gate Practice",
                'type': qtype,
                'bodyHtml': item.get('text', ''),
                'options': opts_list,
                'answer': ans_str,
                'solution': item.get('solution') or None,
                'gateOverflowUrl': None,
                'answerUrl': None,
                'tags': tags
            }
            
            imported_questions.append(q_obj)
            stats['by_subject'][subj] += 1
            stats['by_type'][qtype] += 1
            stats['by_exam']["Knowledge Gate Practice"] += 1

    # 2. BARC questions from data/questions/
    q_files = [n for n in z.namelist() if n.startswith('data/questions/') and n.endswith('.json')]
    for f in q_files:
        items = json.loads(z.read(f).decode('utf-8'))
        for item in items:
            if item.get('exam') != 'BARC':
                continue
            stats['total_scanned'] += 1
            b = clean_text(item.get('text', ''))
            tokens = b.split()
            prefix = ' '.join(tokens[:15]) if len(tokens) >= 15 else b
            opts = options_fingerprint(item.get('options'))
            
            if (b and b in existing_text) or (prefix and prefix in existing_prefixes) or (opts and len(opts) > 20 and opts in existing_options):
                stats['dropped_existing_gate_other'] += 1
                continue
                
            qtype = (item.get('type') or 'MCQ').lower()
            subj = item.get('subject') or 'General'
            topic = item.get('topic') or 'General'
            raw_ans = item.get('correctAnswer')
            ans_str = ['A', 'B', 'C', 'D', 'E', 'F'][raw_ans] if isinstance(raw_ans, int) and 0 <= raw_ans < 6 else str(raw_ans)
            
            opts_list = []
            if item.get('options'):
                for idx, opt in enumerate(item['options']):
                    label = ['A', 'B', 'C', 'D', 'E', 'F'][idx] if idx < 6 else str(idx + 1)
                    opts_list.append({
                        'label': label,
                        'html': opt.get('html', '') if isinstance(opt, dict) else str(opt)
                    })
                    
            q_obj = {
                'id': f"barc_{item['id']}",
                'number': f"BARC-{item.get('year', 2013)}-{item.get('number', item['id'][:6])}",
                'title': item.get('title') or f"BARC {item.get('year')} {subj}",
                'volume': 1,
                'subject': subj,
                'subjectId': f"other_{slugify(subj)}",
                'topic': topic,
                'topicId': f"other_{slugify(subj)}_{slugify(topic)}",
                'topicNumber': "1.1",
                'year': item.get('year') or 2013,
                'exam': "BARC CSE",
                'type': qtype,
                'bodyHtml': item.get('text', ''),
                'options': opts_list,
                'answer': ans_str,
                'solution': item.get('solution') or None,
                'gateOverflowUrl': None,
                'answerUrl': None,
                'tags': ["barc", slugify(subj)]
            }
            imported_questions.append(q_obj)
            stats['by_exam']["BARC CSE"] += 1
            stats['by_type'][qtype] += 1

print("\n--- Summary ---")
print(f"Total scanned: {stats['total_scanned']}")
print(f"Internal duplicates dropped: {stats['dropped_internal_dup']}")
print(f"Duplicates of existing GATE/Other dropped: {stats['dropped_existing_gate_other']}")
print(f"Total unique new questions ready to import: {len(imported_questions)}")
print("\nBy Exam:", dict(stats['by_exam']))
print("By Type:", dict(stats['by_type']))
print("By Subject:", dict(stats['by_subject'].most_common()))
print("\nSample question 0:")
sample0 = imported_questions[0]
for k in ['id', 'number', 'exam', 'type', 'subject', 'topic', 'answer']:
    print(f"  {k}: {sample0[k]}")
print(f"  options: {len(sample0['options'])}")
print(f"  solution present: {bool(sample0.get('solution'))} (len: {len(sample0.get('solution') or '')})")
