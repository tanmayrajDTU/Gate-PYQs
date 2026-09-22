// scripts/consolidate_other_subjects.mjs
import fs from 'node:fs';
import path from 'node:path';

const filePath = path.join(process.cwd(), 'data', 'other-questions.json');
const questions = JSON.parse(fs.readFileSync(filePath, 'utf8'));

console.log(`Loaded ${questions.length} questions from ${filePath}`);

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

let modifiedCount = 0;

const updated = questions.map(q => {
  let subject = q.subject;
  let subjectId = q.subjectId;
  let topic = q.topic;
  let topicId = q.topicId;
  let topicNumber = q.topicNumber;
  let changed = false;

  // 1. Align Knowledge Gate naming conventions with standard CSE subjects
  if (q.exam === 'Knowledge Gate Practice') {
    if (subject === 'Algorithm') {
      subject = 'Algorithms';
      subjectId = 'other_algorithms';
      changed = true;
    } else if (subject === 'COA') {
      subject = 'CO & Architecture';
      subjectId = 'other_co_architecture';
      changed = true;
    } else if (subject === 'Data Base Management System') {
      subject = 'Databases';
      subjectId = 'other_databases';
      changed = true;
    } else if (subject === 'Data Structure') {
      subject = 'Data Structures';
      subjectId = 'other_data_structures';
      changed = true;
    } else if (subject === 'Digital Electronics') {
      subject = 'Digital Logic';
      subjectId = 'other_digital_logic';
      changed = true;
    }
  }

  // 2. Fix seed questions
  if (q.id === 'isro_2020_q1') {
    subject = 'Algorithms';
    subjectId = 'isro_algorithms';
    topic = 'Asymptotic Notations';
    topicId = 'isro_asymptotic_notations';
    changed = true;
  } else if (q.id === 'isro_2020_q2') {
    subject = 'Operating System';
    subjectId = 'isro_operating_system';
    topic = 'Process Synchronization';
    topicId = 'isro_process_synchronization';
    changed = true;
  }

  // 3. ISRO CSE consolidation (42 fragmented subcategories -> 17 standard subjects)
  else if (q.exam === 'ISRO CSE') {
    if (subject === 'Algorithms') {
      subjectId = 'isro_algorithms';
    } else if (subject === 'Operating System') {
      subjectId = 'isro_operating_system';
    } else if (subject.startsWith('Discrete Mathematics:')) {
      const subcat = subject.split(':')[1].trim();
      subject = 'Discrete Mathematics';
      subjectId = 'isro_discrete_mathematics';
      if (subcat === 'Combinatory') {
        topic = 'Combinatorics';
      } else if (!topic || topic === 'ISRO PYQ') {
        topic = subcat;
      }
      topicId = 'isro_' + slugify(topic);
      changed = true;
    } else if (subject.startsWith('Engineering Mathematics:')) {
      const subcat = subject.split(':')[1].trim();
      subject = 'Engineering Mathematics';
      subjectId = 'isro_engineering_mathematics';
      if (!topic || topic === 'ISRO PYQ') {
        topic = subcat;
      }
      topicId = 'isro_' + slugify(topic);
      changed = true;
    } else if (subject.startsWith('General Aptitude:')) {
      const subcat = subject.split(':')[1].trim();
      subject = 'General Aptitude';
      subjectId = 'isro_general_aptitude';
      if (!topic || topic === 'ISRO PYQ' || topic === 'General') {
        topic = subcat;
      }
      topicId = 'isro_' + slugify(topic);
      changed = true;
    } else if (subject === 'Programming: Programming in C') {
      subject = 'C Programming';
      subjectId = 'isro_c_programming';
      if (!topic || topic === 'ISRO PYQ') topic = 'C Programming';
      topicId = 'isro_' + slugify(topic);
      changed = true;
    } else if (subject === 'Programming and DS: Data Structures') {
      subject = 'Data Structures';
      subjectId = 'isro_data_structures';
      if (!topic || topic === 'ISRO PYQ') topic = 'Data Structures';
      topicId = 'isro_' + slugify(topic);
      changed = true;
    } else if (subject === 'Programming and DS') {
      subject = 'C Programming';
      subjectId = 'isro_c_programming';
      topic = 'Output & Tracing';
      topicId = 'isro_output_tracing';
      changed = true;
    } else if (subject === 'Non GATE CSE: IS&Software Engineering') {
      subject = 'Software Engineering';
      subjectId = 'isro_software_engineering';
      if (!topic || topic === 'ISRO PYQ' || topic === 'Is&software Engineering') {
        topic = 'Software Engineering';
      }
      topicId = 'isro_' + slugify(topic);
      changed = true;
    } else if (subject.startsWith('Non GATE CSE:')) {
      const subcat = subject.split(':')[1].trim();
      subject = 'Non-GATE CSE Topics';
      subjectId = 'isro_non_gate_cse';
      if (!topic || topic === 'ISRO PYQ') {
        topic = subcat;
      }
      topicId = 'isro_' + slugify(topic);
      changed = true;
    }
  }

  // 4. TIFR CSE consolidation (22 fragmented subcategories -> 14 standard subjects)
  else if (q.exam === 'TIFR CSE') {
    if (subject === 'Algorithms') {
      subjectId = 'tifr_algorithms';
    } else if (subject === 'Operating System') {
      subjectId = 'tifr_operating_system';
    } else if (subject.startsWith('Discrete Mathematics:')) {
      const subcat = subject.split(':')[1].trim();
      subject = 'Discrete Mathematics';
      subjectId = 'tifr_discrete_mathematics';
      if (!topic || topic === 'TIFR PYQ') {
        topic = subcat;
      }
      topicId = 'tifr_' + slugify(topic);
      changed = true;
    } else if (subject.startsWith('Engineering Mathematics:')) {
      const subcat = subject.split(':')[1].trim();
      subject = 'Engineering Mathematics';
      subjectId = 'tifr_engineering_mathematics';
      if (!topic || topic === 'TIFR PYQ') {
        topic = subcat;
      }
      topicId = 'tifr_' + slugify(topic);
      changed = true;
    } else if (subject.startsWith('General Aptitude:')) {
      const subcat = subject.split(':')[1].trim();
      subject = 'General Aptitude';
      subjectId = 'tifr_general_aptitude';
      if (!topic || topic === 'TIFR PYQ') {
        topic = subcat;
      }
      topicId = 'tifr_' + slugify(topic);
      changed = true;
    } else if (subject === 'Programming: Programming in C') {
      subject = 'C Programming';
      subjectId = 'tifr_c_programming';
      if (!topic || topic === 'TIFR PYQ') topic = 'C Programming';
      topicId = 'tifr_' + slugify(topic);
      changed = true;
    } else if (subject === 'Programming and DS: Data Structures') {
      subject = 'Data Structures';
      subjectId = 'tifr_data_structures';
      if (!topic || topic === 'TIFR PYQ') topic = 'Data Structures';
      topicId = 'tifr_' + slugify(topic);
      changed = true;
    } else if (subject.startsWith('Non GATE CSE:')) {
      const subcat = subject.split(':')[1].trim();
      subject = 'Non-GATE CSE Topics';
      subjectId = 'tifr_non_gate_cse';
      if (!topic || topic === 'TIFR PYQ') {
        topic = subcat;
      }
      topicId = 'tifr_' + slugify(topic);
      changed = true;
    } else if (subject === 'Others: Others') {
      subject = 'Others';
      subjectId = 'tifr_others';
      if (!topic || topic === 'TIFR PYQ') {
        topic = 'Miscellaneous';
      }
      topicId = 'tifr_others_miscellaneous';
      changed = true;
    }
  }

  if (changed) modifiedCount++;

  return {
    ...q,
    subject,
    subjectId,
    topic,
    topicId,
    topicNumber: topicNumber || '1.1',
  };
});

console.log(`Modified ${modifiedCount} questions for subject normalization.`);

fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf8');
console.log(`Successfully updated ${filePath}`);
