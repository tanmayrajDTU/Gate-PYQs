import sys, re, json, fitz

sys.stdout.reconfigure(encoding='utf-8')
doc = fitz.open('scripts/isro_w_cover.pdf')
toc = doc.get_toc()

# 1. Map Subject and Topic page ranges from TOC
subject_ranges = []
topic_ranges = []

for item in toc:
    lvl, title, page = item
    if 'table of contents' in title.lower() or 'contributors' in title.lower():
        continue
    if lvl == 1:
        m = re.match(r'^\d+\s+(.*?)(?:\s*\(\d+\))?$', title)
        s_name = m.group(1).strip() if m else title.strip()
        subject_ranges.append((page, s_name))
    elif lvl == 2 and 'answer' not in title.lower():
        m = re.match(r'^\d+\.\d+\s+(.*?)(?:\s*\(\d+\))?$', title)
        t_name = m.group(1).strip() if m else title.strip()
        topic_ranges.append((page, t_name))

def get_subject(p):
    cur = 'General Computer Science'
    for start_p, name in subject_ranges:
        if p >= start_p:
            cur = name
        else:
            break
    return cur

def get_topic(p):
    cur = 'ISRO PYQ'
    for start_p, name in topic_ranges:
        if p >= start_p:
            cur = name
        else:
            break
    return cur

# 2. Parse all Answer Keys from Answer Keys sections
answer_keys = {}
for page in doc:
    text = page.get_text()
    if 'Answer Keys' in text:
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        try:
            ak_idx = lines.index('Answer Keys')
            i = ak_idx + 1
            while i < len(lines) - 1:
                t1 = lines[i]
                t2 = lines[i+1]
                if re.match(r'^\d+\.\d+\.\d+$', t1):
                    if re.match(r'^[A-DXa-dx0-9\.;\- ]+$', t2) and not re.match(r'^\d+\.\d+\.\d+$', t2):
                        answer_keys[t1] = t2.upper()
                        i += 2
                    else:
                        i += 1
                else:
                    i += 1
        except ValueError:
            pass

print(f'Parsed {len(answer_keys)} official answer keys.')

# 3. Match questions, numbers, and metadata across all pages
manifest = []
seen_post_ids = set()

for page_idx in range(len(doc)):
    p_num = page_idx + 1
    page = doc[page_idx]
    
    links = [l for l in page.get_links() if 'gateoverflow.in/' in l.get('uri', '') and re.search(r'/\d+/[a-z0-9\-]+', l.get('uri', ''))]
    nums = [b for b in page.get_text('blocks') if re.match(r'^\d+\.\d+\.\d+$', b[4].strip())]
    
    links_sorted = sorted(links, key=lambda l: l['from'].y0)
    nums_sorted = sorted(nums, key=lambda b: b[1])
    
    subj = get_subject(p_num)
    topic = get_topic(p_num)
    
    for l in links_sorted:
        uri = l['uri']
        m = re.match(r'https://gateoverflow\.in/(\d+)/([a-z0-9\-]+)$', uri)
        if not m:
            continue
            
        post_id = m.group(1)
        slug = m.group(2)
        if post_id in seen_post_ids:
            continue
        seen_post_ids.add(post_id)
        
        # Closest question number
        ly = l['from'].y0
        best_n = None
        min_d = 999
        for b in nums_sorted:
            d = abs(b[1] - ly)
            if d < min_d:
                min_d = d
                best_n = b[4].strip()
        
        q_num = best_n if (best_n and min_d < 25) else f'ISRO-{len(manifest)+1}'
        
        # Year extraction
        ym = re.search(r'(?:isro|gate)?(?:[a-z\-]+)?(19\d\d|20\d\d)', slug)
        year = int(ym.group(1)) if ym else None
        
        # Official answer from table
        ans = answer_keys.get(q_num, None)
        if ans == 'X':
            ans = 'MTA' # Marks to All / Ambiguous
            
        manifest.append({
            'postId': post_id,
            'number': q_num,
            'slug': slug,
            'title': slug.replace('-', ' ').title(),
            'url': uri,
            'subject': subj,
            'subjectId': 'isro_' + re.sub(r'[^a-z0-9]+', '_', subj.lower()).strip('_'),
            'topic': topic,
            'topicId': 'isro_' + re.sub(r'[^a-z0-9]+', '_', topic.lower()).strip('_'),
            'year': year,
            'answer': ans,
            'page': p_num
        })

print(f'Total manifest items: {len(manifest)}')
with open('scripts/isro_manifest.json', 'w', encoding='utf-8') as f:
    json.dump(manifest, f, indent=2)

print('Successfully saved to scripts/isro_manifest.json!')
