import zipfile, json

with zipfile.ZipFile('scripts/practice data.zip', 'r') as z:
    p_files = [n for n in z.namelist() if n.startswith('data/practice/questions/') and n.endswith('.json')]
    nat_samples = []
    for f in p_files:
        for item in json.loads(z.read(f).decode('utf-8')):
            if item.get('type') == 'NAT':
                nat_samples.append(item.get('correctAnswer'))
                if len(nat_samples) >= 10: break
        if len(nat_samples) >= 10: break

for i, s in enumerate(nat_samples):
    print(f"NAT sample {i}:", s)
