export const EXAMS = ['SSC CGL', 'SSC CHSL', 'UPSC', 'RRB NTPC', 'NDA', 'IBPS PO'];

export const LEVELS = ['easy', 'medium', 'hard'];

export const DEFAULT_MIX = { easy: 30, medium: 50, hard: 20 };

export const mixTotal = (mix) => LEVELS.reduce((sum, level) => sum + (Number(mix?.[level]) || 0), 0);

// Taxonomy doc tree ([{sub_subject, topic, subtopics}]) -> editable nested structure.
export function treeToEditor(doc) {
  const subSubjects = doc?.sub_subjects || [];
  const tree = doc?.tree || [];
  if (subSubjects.length) {
    return {
      hasSubSubjects: true,
      subSubjects: subSubjects.map((name) => ({
        name,
        topics: tree
          .filter((e) => e.sub_subject === name)
          .map((e) => ({ name: e.topic, subtopics: [...e.subtopics] })),
      })),
      topics: [],
    };
  }
  return {
    hasSubSubjects: false,
    subSubjects: [],
    topics: tree.map((e) => ({ name: e.topic, subtopics: [...e.subtopics] })),
  };
}

const topicMap = (topics) =>
  Object.fromEntries(
    topics
      .filter((t) => t.name.trim())
      .map((t) => [t.name.trim(), t.subtopics.map((s) => s.trim()).filter(Boolean)])
  );

// Editable structure -> PUT /generation/taxonomy payload.
export function editorToPayload(subject, editor) {
  if (editor.hasSubSubjects) {
    return {
      subject,
      sub_subjects: Object.fromEntries(
        editor.subSubjects.filter((s) => s.name.trim()).map((s) => [s.name.trim(), topicMap(s.topics)])
      ),
    };
  }
  return { subject, topics: topicMap(editor.topics) };
}

// Topics available under a sub-subject in a taxonomy doc (all topics when no sub-subject chosen).
export function topicsFor(doc, subSubject) {
  const tree = doc?.tree || [];
  return [...new Set(tree.filter((e) => !subSubject || e.sub_subject === subSubject).map((e) => e.topic))];
}

// Blueprint as returned by the API -> payload for PUT, cleaned for the chosen mode.
export function cleanBlueprint(blueprint, mode) {
  const weights = mode === 'weights';
  const node = (n, extra) => {
    const out = { ...extra };
    if (n.difficulty) out.difficulty = n.difficulty;
    if (weights && n.weight) out.weight = Number(n.weight);
    return out;
  };
  return {
    subject: blueprint.subject,
    total_questions: weights ? Number(blueprint.total_questions) || null : null,
    difficulty: blueprint.difficulty || DEFAULT_MIX,
    sections: blueprint.sections.map((s) =>
      node(s, {
        sub_subject: s.sub_subject ?? null,
        topics: s.topics.map((t) =>
          node(t, {
            topic: t.topic,
            subtopics: t.subtopics.map((st) => {
              const out = node(st, { subtopic: st.subtopic });
              if (!weights) out.count = Number(st.count) || 1;
              return out;
            }),
          })
        ),
      })
    ),
  };
}

export const errorText = (err) => err?.message || String(err);

// ── JSON import ────────────────────────────────────────────────────

const topicEntries = (map) =>
  Object.entries(map || {}).map(([name, subtopics]) => ({ name, subtopics: [...(subtopics || [])] }));

// PUT /generation/taxonomy payload -> editable structure.
export function payloadToEditor(payload) {
  if (payload.sub_subjects) {
    return {
      hasSubSubjects: true,
      subSubjects: Object.entries(payload.sub_subjects).map(([name, topics]) => ({ name, topics: topicEntries(topics) })),
      topics: [],
    };
  }
  return { hasSubSubjects: false, subSubjects: [], topics: topicEntries(payload.topics) };
}

const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);

export function validateTaxonomyJson(data) {
  if (!isObject(data)) return 'The JSON must be an object like {"subject": ..., "sub_subjects": {...}}.';
  if (typeof data.subject !== 'string' || !data.subject.trim()) return '"subject" (text) is required.';
  const hasSubs = data.sub_subjects !== undefined;
  const hasTopics = data.topics !== undefined;
  if (hasSubs === hasTopics) return 'Give exactly one of "sub_subjects" or "topics".';
  const block = hasSubs ? data.sub_subjects : data.topics;
  if (!isObject(block)) return `"${hasSubs ? 'sub_subjects' : 'topics'}" must be an object.`;
  const checkTopics = (topics, where) => {
    if (!isObject(topics)) return `${where} must map topic names to lists of subtopics.`;
    for (const [topic, subs] of Object.entries(topics)) {
      if (!Array.isArray(subs) || subs.some((s) => typeof s !== 'string')) {
        return `Topic "${topic}"${where ? ` in ${where}` : ''} must be a list of subtopic names.`;
      }
    }
    return null;
  };
  if (hasSubs) {
    for (const [name, topics] of Object.entries(block)) {
      const problem = checkTopics(topics, `sub-subject "${name}"`);
      if (problem) return problem;
    }
    return null;
  }
  return checkTopics(block, '');
}

export function validateBlueprintJson(data) {
  if (!isObject(data)) return 'The JSON must be an object like {"subject": ..., "sections": [...]}.';
  if (typeof data.subject !== 'string' || !data.subject.trim()) return '"subject" (text) is required.';
  if (!Array.isArray(data.sections) || !data.sections.length) return '"sections" must be a non-empty list.';
  for (const s of data.sections) {
    if (!Array.isArray(s.topics) || !s.topics.length) return `Section ${s.sub_subject ?? '(no sub-subject)'} needs a "topics" list.`;
    for (const t of s.topics) {
      if (!t.topic || !Array.isArray(t.subtopics) || !t.subtopics.length) return `Topic ${t.topic || '(unnamed)'} needs a "subtopics" list.`;
    }
  }
  return null;
}

export const TAXONOMY_EXAMPLE = JSON.stringify(
  {
    subject: 'Science',
    sub_subjects: {
      Chemistry: {
        'Chemical Reactions and Equations': [
          'Chemical Equations',
          'Balancing Chemical Equations',
          'Types of Chemical Reactions',
          'Oxidation and Reduction',
          'Corrosion and Rancidity',
        ],
      },
      Physics: { Light: ['Reflection', 'Refraction'] },
      Biology: {},
    },
  },
  null,
  2
);

export const BLUEPRINT_EXAMPLE = JSON.stringify(
  {
    subject: 'Science',
    total_questions: 10,
    difficulty: { easy: 30, medium: 50, hard: 20 },
    sections: [
      {
        sub_subject: 'Chemistry',
        topics: [
          {
            topic: 'Chemical Reactions and Equations',
            subtopics: [
              { subtopic: 'Types of Chemical Reactions', weight: 3 },
              { subtopic: 'Balancing Chemical Equations', weight: 2 },
              { subtopic: 'Chemical Equations', weight: 1 },
              { subtopic: 'Oxidation and Reduction', weight: 1 },
              { subtopic: 'Corrosion and Rancidity', weight: 1 },
            ],
          },
        ],
      },
    ],
  },
  null,
  2
);
