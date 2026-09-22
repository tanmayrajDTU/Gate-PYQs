import zipfile, json
from collections import Counter

with zipfile.ZipFile('scripts/practice data.zip', 'r') as z:
    p_files = [n for n in z.namelist() if n.startswith('data/practice/questions/') and n.endswith('.json')]
    mcq_ans_types = Counter()
    msq_ans_types = Counter()
    nat_ans_types = Counter()
    
    sample_mcq = []
    sample_msq = []
    sample_nat = []
    
    for f in p_files:
        for item in json.loads(z.read(f).decode('utf-8')):
            qtype = item.get('type')
            ans = item.get('correctAnswer')
            t_name = type(ans).__name__
            if qtype == 'MCQ':
                mcq_ans_types[t_name] += 1
                if len(sample_mcq) < 5: sample_mcq.append((ans, item.get('options')))
            elif qtype == 'MSQ':
                msq_ans_types[t_name] += 1
                if len(sample_msq) < 5: sample_msq.append((ans, item.get('options')))
            elif qtype == 'NAT':
                nat_ans_types[t_name] += 1
                if len(sample_nat) < 5: sample_nat.append(ans)

    print('MCQ ans types:', dict(mcq_ans_types))
    print('MSQ ans types:', dict(msq_ans_types))
    print('NAT ans types:', dict(nat_ans_types))
    print('\nSample MCQ ans:', sample_mcq[:3])
    print('\nSample MSQ ans:', sample_msq[:3])
    print('\nSample NAT ans:', sample_nat[:3])
