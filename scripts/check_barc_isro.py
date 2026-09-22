import zipfile, json

with zipfile.ZipFile('scripts/practice data.zip', 'r') as z:
    for f in [n for n in z.namelist() if n.startswith('data/questions/') and n.endswith('.json')]:
        for item in json.loads(z.read(f).decode('utf-8')):
            if item.get('exam') in ['BARC', 'ISRO']:
                print(f"Exam: {item.get('exam')}, Year: {item.get('year')}, Subject: {item.get('subject')}, Title: {item.get('title')}")
                print(f"  Text: {item.get('text', '')[:80]}")
