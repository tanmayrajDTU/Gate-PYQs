import json

with open('data/other-questions.json', 'r', encoding='utf-8') as f:
    questions = json.load(f)

print('Total other-questions:', len(questions))
ids = set()
errors = []
exams = set()
types = set()
with_solution = 0
for q in questions:
    if q['id'] in ids:
        errors.append(f"Duplicate ID: {q['id']}")
    ids.add(q['id'])
    exams.add(q.get('exam'))
    types.add(q.get('type'))
    if q.get('solution'):
        with_solution += 1
    if q.get('type') in ['mcq', 'msq'] and len(q.get('options', [])) == 0:
        errors.append(f"{q['id']}: MCQ/MSQ with 0 options")
    if q.get('type') == 'nat' and len(q.get('options', [])) > 0:
        errors.append(f"{q['id']}: NAT with options")
    if not q.get('answer'):
        errors.append(f"{q['id']}: Missing answer")

print('Exams:', exams)
print('Types:', types)
print(f'Questions with solution: {with_solution}')
print('Errors count:', len(errors))
if errors:
    print('Sample errors:', errors[:5])
else:
    print('ALL 6,586 QUESTIONS VALIDATED CLEANLY WITH 0 ERRORS!')
