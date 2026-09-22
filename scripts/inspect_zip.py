import zipfile
import json

with zipfile.ZipFile('scripts/practice data.zip', 'r') as z:
    for prefix in ['data/questions/', 'data/practice/questions/']:
        print(f'=== Samples from {prefix} ===')
        files = [n for n in z.namelist() if n.startswith(prefix) and n.endswith('.json')]
        for f in files[:2]:
            data = json.loads(z.read(f).decode('utf-8'))
            print(f'File: {f} (count: {len(data)})')
            for i in range(min(2, len(data))):
                item = data[i]
                print(f'  [{i}] ID: {item.get("id")}, Num: {item.get("number")}, Type: {item.get("type")}, Exam: {item.get("exam")}, Year: {item.get("year")}')
                print(f'       Title: {item.get("title")[:80] if item.get("title") else None}')
                print(f'       Subject: {item.get("subject")}, Topic: {item.get("topic")}, Subtopic: {item.get("subtopic")}')
                print(f'       Answer: {item.get("correctAnswer")} (type: {type(item.get("correctAnswer")).__name__})')
                print(f'       Options count: {len(item.get("options", []))}')
                if item.get('options'):
                    print(f'       Sample opt 0: {item["options"][0]}')
                print(f'       Text snippet: {repr(item.get("text", ""))[:100]}')
                print(f'       Solution snippet: {repr(item.get("solution", ""))[:100]}')
