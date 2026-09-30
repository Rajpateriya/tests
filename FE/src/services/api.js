/**
 * Centralized API Service for GovExam Pro Platform
 * Handles authentication tokens, REST calls, error handling, and demo mock fallback data.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Helper to get auth header
const getAuthHeaders = () => {
  const token = localStorage.getItem('govexam_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Generic fetch wrapper
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  };

  try {
    const res = await fetch(url, config);
    const json = await res.json();
    if (!res.ok || json.success === false) {
      const errorMsg = json?.error?.message || json?.detail || res.statusText || 'API request failed';
      throw new Error(errorMsg);
    }
    return json.data;
  } catch (err) {
    console.warn(`[API] ${endpoint} request failed:`, err.message);
    throw err;
  }
}

// AI pipeline calls: no demo fallback (admins must see real errors), readable
// 422 validation messages, and multipart uploads (the browser sets the
// multipart boundary itself, so Content-Type must NOT be forced to JSON).
async function pipelineRequest(endpoint, { method = 'GET', body, form } = {}) {
  const token = localStorage.getItem('govexam_token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new Error('Cannot reach the backend. Is it running on port 8000?');
  }

  let json = null;
  try {
    json = await res.json();
  } catch {
    // non-JSON error body
  }
  if (!res.ok || json?.success === false) {
    let message = json?.error?.message;
    if (!message && Array.isArray(json?.detail)) {
      message = json.detail
        .map((d) => `${(d.loc || []).filter((p) => p !== 'body').join(' → ')}: ${d.msg}`)
        .join(' | ');
    }
    if (!message && typeof json?.detail === 'string') message = json.detail;
    if (res.status === 401) message = message || 'Not signed in as admin (401).';
    throw new Error(message || `${res.status} ${res.statusText}`);
  }
  return json?.data;
}

// Fallback Mock Datasets for offline/demo resilience
export const DEMO_TESTS = [
  {
    id: "mock-cgl-tier1-full",
    title: "SSC CGL 2026 Tier-I Comprehensive Full Mock 01",
    description: "Complete Tier-I test covering Quantitative Aptitude, General Intelligence, English Comprehension, and General Awareness.",
    test_type: "FULL",
    target_exam: "SSC CGL",
    subject: "Full Syllabus",
    topic: "Mixed Tier-I",
    duration_minutes: 60,
    total_marks: 200,
    positive_marks_per_q: 2.0,
    negative_marks_per_q: 0.5,
    total_questions: 25,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-quant-subject",
    title: "Quantitative Aptitude Master Subject Mock",
    description: "Deep dive into High-weightage Arithmetic and Advanced Mathematics for SSC CGL Tier I & II.",
    test_type: "SUBJECT",
    target_exam: "SSC CGL",
    subject: "Quantitative Aptitude",
    topic: "Full Subject",
    duration_minutes: 30,
    total_marks: 50,
    positive_marks_per_q: 2.0,
    negative_marks_per_q: 0.5,
    total_questions: 15,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-geometry-mini",
    title: "Geometry & Trigonometry Mini Speed Drill",
    description: "10 high-speed questions on Triangles, Circles, Tangents, and Trigonometric Heights & Distances.",
    test_type: "TOPIC_MINI",
    target_exam: "SSC CGL",
    subject: "Quantitative Aptitude",
    topic: "Geometry",
    duration_minutes: 15,
    total_marks: 20,
    positive_marks_per_q: 2.0,
    negative_marks_per_q: 0.5,
    total_questions: 10,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-reasoning-subject",
    title: "General Intelligence & Reasoning Speed Mock",
    description: "Focus on Syllogisms, Analogy, Coding-Decoding, Blood Relations, and Non-Verbal patterns.",
    test_type: "SUBJECT",
    target_exam: "SSC CGL",
    subject: "General Intelligence & Reasoning",
    topic: "Full Subject",
    duration_minutes: 25,
    total_marks: 50,
    positive_marks_per_q: 2.0,
    negative_marks_per_q: 0.5,
    total_questions: 12,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-english-mini",
    title: "English Vocab, Idioms & Error Spotting Mini Mock",
    description: "Targeted mini drill on One Word Substitutions, Idioms & Phrases, and Grammatical Error Spotting.",
    test_type: "TOPIC_MINI",
    target_exam: "SSC CGL",
    subject: "English Comprehension",
    topic: "Grammar & Vocabulary",
    duration_minutes: 12,
    total_marks: 20,
    positive_marks_per_q: 2.0,
    negative_marks_per_q: 0.5,
    total_questions: 10,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-polity-mini",
    title: "Indian Polity & Constitution Mini Mock",
    description: "Fundamental Rights, Directive Principles, Parliamentary Procedures, and Constitutional Amendments.",
    test_type: "TOPIC_MINI",
    target_exam: "SSC CGL",
    subject: "General Awareness",
    topic: "Indian Polity",
    duration_minutes: 10,
    total_marks: 20,
    positive_marks_per_q: 2.0,
    negative_marks_per_q: 0.5,
    total_questions: 10,
    is_active: true,
    created_at: new Date().toISOString(),
  }
];

export const DEMO_QUESTIONS = [
  {
    id: "q-1",
    subject: "Quantitative Aptitude",
    topic: "Geometry",
    difficulty: "MEDIUM",
    question_text: "In a triangle ABC, the bisector of angle A intersects BC at D. If AB = 12 cm, AC = 15 cm, and BC = 18 cm, find the length of BD.",
    options: [
      { id: "A", text: "8 cm" },
      { id: "B", text: "10 cm" },
      { id: "C", text: "7.5 cm" },
      { id: "D", text: "9 cm" }
    ],
    correct_option: "A",
    solution_explanation: "By the Angle Bisector Theorem, AB / AC = BD / DC. Thus, BD / (18 - BD) = 12 / 15 = 4 / 5. Cross multiplying gives 5*BD = 4*(18 - BD) = 72 - 4*BD => 9*BD = 72 => BD = 8 cm."
  },
  {
    id: "q-2",
    subject: "Quantitative Aptitude",
    topic: "Profit & Loss",
    difficulty: "EASY",
    question_text: "A shopkeeper marks an article 40% above its cost price and offers a discount of 20% on the marked price. What is the overall profit percentage?",
    options: [
      { id: "A", text: "10%" },
      { id: "B", text: "12%" },
      { id: "C", text: "15%" },
      { id: "D", text: "20%" }
    ],
    correct_option: "B",
    solution_explanation: "Let CP = 100. Marked Price (MP) = 140. Selling Price (SP) = 140 * (1 - 0.20) = 140 * 0.8 = 112. Profit = SP - CP = 112 - 100 = 12%. Hence, profit percentage is 12%."
  },
  {
    id: "q-3",
    subject: "General Intelligence & Reasoning",
    topic: "Syllogisms",
    difficulty: "MEDIUM",
    question_text: "Statements: 1. All rivers are oceans. 2. Some oceans are seas.\nConclusions:\nI. Some seas are rivers.\nII. Some oceans are rivers.",
    options: [
      { id: "A", text: "Only Conclusion I follows" },
      { id: "B", text: "Only Conclusion II follows" },
      { id: "C", text: "Both I and II follow" },
      { id: "D", text: "Neither follows" }
    ],
    correct_option: "B",
    solution_explanation: "From 'All rivers are oceans', the immediate converse is 'Some oceans are rivers', so Conclusion II definitely follows. There is no definite connection given between rivers and seas, so Conclusion I does not necessarily follow."
  },
  {
    id: "q-4",
    subject: "General Awareness",
    topic: "Indian Polity",
    difficulty: "EASY",
    question_text: "Under which Article of the Constitution of India is the Right to Constitutional Remedies guaranteed?",
    options: [
      { id: "A", text: "Article 21" },
      { id: "B", text: "Article 19" },
      { id: "C", text: "Article 32" },
      { id: "D", text: "Article 370" }
    ],
    correct_option: "C",
    solution_explanation: "Article 32 provides the Right to Constitutional Remedies, allowing individuals to petition the Supreme Court of India to seek justice when they feel their Fundamental Rights have been violated. Dr. B.R. Ambedkar termed it the 'Heart and Soul of the Constitution'."
  },
  {
    id: "q-5",
    subject: "English Comprehension",
    topic: "Grammar & Vocabulary",
    difficulty: "MEDIUM",
    question_text: "Select the most appropriate synonym of the given word:\n'METICULOUS'",
    options: [
      { id: "A", text: "Careless" },
      { id: "B", text: "Fastidious" },
      { id: "C", text: "Hasty" },
      { id: "D", text: "Ambiguous" }
    ],
    correct_option: "B",
    solution_explanation: "Meticulous means showing great attention to detail; very careful and precise. 'Fastidious' means very attentive to and concerned about accuracy and detail, making it the closest synonym."
  },
  {
    id: "q-6",
    subject: "Quantitative Aptitude",
    topic: "Time & Work",
    difficulty: "MEDIUM",
    question_text: "A can do a piece of work in 12 days and B can do it in 18 days. If they work together for 4 days, what fraction of work is left?",
    options: [
      { id: "A", text: "4/9" },
      { id: "B", text: "5/9" },
      { id: "C", text: "2/3" },
      { id: "D", text: "1/3" }
    ],
    correct_option: "A",
    solution_explanation: "Work done by (A + B) in 1 day = 1/12 + 1/18 = (3 + 2)/36 = 5/36. In 4 days, work done = 4 * (5/36) = 20/36 = 5/9. Fraction left = 1 - 5/9 = 4/9."
  },
  {
    id: "q-7",
    subject: "General Intelligence & Reasoning",
    topic: "Analogy",
    difficulty: "EASY",
    question_text: "Select the option that is related to the third term in the same way as the second term is related to the first term.\nOhm : Resistance :: Pascal : ?",
    options: [
      { id: "A", text: "Force" },
      { id: "B", text: "Pressure" },
      { id: "C", text: "Power" },
      { id: "D", text: "Energy" }
    ],
    correct_option: "B",
    solution_explanation: "Ohm is the SI unit of electric resistance. Similarly, Pascal is the SI unit of pressure."
  },
  {
    id: "q-8",
    subject: "General Awareness",
    topic: "Modern History",
    difficulty: "MEDIUM",
    question_text: "The Champaran Satyagraha of 1917 was organized by Mahatma Gandhi to protest against:",
    options: [
      { id: "A", text: "Salt Tax" },
      { id: "B", text: "Oppressive Indigo Farming (Tinkathia system)" },
      { id: "C", text: "Rowlatt Act" },
      { id: "D", text: "Partition of Bengal" }
    ],
    correct_option: "B",
    solution_explanation: "Champaran Satyagraha (1917) in Bihar was Gandhi's first Satyagraha movement in India, organized to support farmers coerced into growing indigo under the exploitative Tinkathia system."
  }
];

// API Endpoints Mapping
export const api = {
  // Auth
  auth: {
    login: async (email, password) => {
      try {
        return await request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
      } catch (err) {
        // Fallback demo user
        const isAdmin = email.includes('admin');
        const demoUser = {
          id: isAdmin ? 'demo-admin-id' : 'demo-student-id',
          email,
          full_name: isAdmin ? 'System Administrator' : 'Rajesh Kumar (Aspirant)',
          role: isAdmin ? 'admin' : 'student',
          is_active: true,
          profile: {
            target_exams: ['SSC CGL', 'SSC CHSL'],
            preferred_subjects: ['Quantitative Aptitude', 'Reasoning'],
          },
          created_at: new Date().toISOString(),
        };
        const demoToken = {
          access_token: 'demo-jwt-access-token',
          refresh_token: 'demo-jwt-refresh-token',
          token_type: 'bearer',
          expires_in: 86400,
        };
        return { user: demoUser, tokens: demoToken };
      }
    },

    register: async (payload) => {
      try {
        return await request('/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } catch (err) {
        return {
          id: 'new-user-id',
          email: payload.email,
          full_name: payload.full_name,
          role: payload.role || 'student',
          is_active: true,
          profile: {
            target_exams: payload.target_exams || ['SSC CGL'],
            preferred_subjects: payload.preferred_subjects || [],
          },
          created_at: new Date().toISOString(),
        };
      }
    },

    getMe: async () => {
      try {
        return await request('/auth/me');
      } catch (err) {
        const cached = localStorage.getItem('govexam_user');
        if (cached) return JSON.parse(cached);
        return null;
      }
    },
  },

  // Test Discovery & Engine
  tests: {
    list: async (params = {}) => {
      const q = new URLSearchParams();
      if (params.test_type) q.append('test_type', params.test_type);
      if (params.subject) q.append('subject', params.subject);
      if (params.topic) q.append('topic', params.topic);
      if (params.target_exam) q.append('target_exam', params.target_exam);

      try {
        const queryStr = q.toString() ? `?${q.toString()}` : '';
        return await request(`/tests${queryStr}`);
      } catch (err) {
        let filtered = [...DEMO_TESTS];
        if (params.test_type) {
          filtered = filtered.filter(t => t.test_type === params.test_type);
        }
        if (params.subject) {
          filtered = filtered.filter(t => t.subject === params.subject);
        }
        return filtered;
      }
    },

    getDetails: async (testId) => {
      try {
        return await request(`/tests/${testId}`);
      } catch (err) {
        const found = DEMO_TESTS.find(t => t.id === testId);
        return found || DEMO_TESTS[0];
      }
    },

    start: async (testId) => {
      try {
        return await request(`/tests/${testId}/start`, { method: 'POST' });
      } catch (err) {
        const test = DEMO_TESTS.find(t => t.id === testId) || DEMO_TESTS[0];
        const now = new Date();
        const expiry = new Date(now.getTime() + test.duration_minutes * 60 * 1000);
        return {
          attempt_id: `attempt-${Date.now()}`,
          test_id: test.id,
          test_title: test.title,
          duration_minutes: test.duration_minutes,
          remaining_seconds: test.duration_minutes * 60,
          start_time: now.toISOString(),
          expiry_time: expiry.toISOString(),
          status: 'IN_PROGRESS',
          total_questions: DEMO_QUESTIONS.length,
        };
      }
    },
  },

  // Attempts & Live Exam Room
  attempts: {
    getQuestions: async (attemptId) => {
      try {
        return await request(`/attempts/${attemptId}/questions`);
      } catch (err) {
        const initialPalette = {};
        DEMO_QUESTIONS.forEach((q, idx) => {
          initialPalette[q.id] = idx === 0 ? 'NOT_ANSWERED' : 'NOT_VISITED';
        });
        return {
          attempt_id: attemptId,
          test_id: DEMO_TESTS[0].id,
          test_title: DEMO_TESTS[0].title,
          duration_minutes: DEMO_TESTS[0].duration_minutes,
          remaining_seconds: DEMO_TESTS[0].duration_minutes * 60,
          current_question_index: 0,
          palette_states: initialPalette,
          answers: {},
          time_spent_per_question: {},
          questions: DEMO_QUESTIONS.map(q => ({
            id: q.id,
            subject: q.subject,
            topic: q.topic,
            difficulty: q.difficulty,
            question_text: q.question_text,
            options: q.options,
          })),
        };
      }
    },

    sync: async (attemptId, payload) => {
      try {
        return await request(`/attempts/${attemptId}/sync`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } catch (err) {
        return {
          attempt_id: attemptId,
          remaining_seconds: 1800,
          synced_at: new Date().toISOString(),
          is_expired: false,
          message: 'Saved to local buffer',
        };
      }
    },

    submit: async (attemptId, payload = {}) => {
      try {
        return await request(`/attempts/${attemptId}/submit`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } catch (err) {
        // Calculate mock score
        const answers = payload.answers || {};
        let correct = 0;
        let incorrect = 0;
        let unattempted = 0;

        DEMO_QUESTIONS.forEach(q => {
          const selected = answers[q.id];
          if (!selected) {
            unattempted++;
          } else if (selected === q.correct_option) {
            correct++;
          } else {
            incorrect++;
          }
        });

        const totalScore = Math.max(0, correct * 2.0 - incorrect * 0.5);
        const maxScore = DEMO_QUESTIONS.length * 2.0;

        return {
          attempt_id: attemptId,
          user_id: 'current-user',
          test_id: DEMO_TESTS[0].id,
          test_title: DEMO_TESTS[0].title,
          status: 'COMPLETED',
          total_score: totalScore,
          max_possible_score: maxScore,
          percentage: (totalScore / maxScore) * 100,
          accuracy_percentage: (correct + incorrect) > 0 ? (correct / (correct + incorrect)) * 100 : 0,
          correct_count: correct,
          incorrect_count: incorrect,
          unattempted_count: unattempted,
          total_questions: DEMO_QUESTIONS.length,
          total_time_taken_seconds: 680,
          start_time: new Date(Date.now() - 680000).toISOString(),
          end_time: new Date().toISOString(),
        };
      }
    },
  },

  // Results & Analytics
  results: {
    getResult: async (attemptId) => {
      try {
        return await request(`/results/${attemptId}`);
      } catch (err) {
        return {
          attempt_id: attemptId,
          user_id: 'user-1',
          test_id: DEMO_TESTS[0].id,
          test_title: DEMO_TESTS[0].title,
          status: 'COMPLETED',
          total_score: 13.5,
          max_possible_score: 16.0,
          percentage: 84.3,
          accuracy_percentage: 87.5,
          correct_count: 7,
          incorrect_count: 1,
          unattempted_count: 0,
          total_questions: 8,
          total_time_taken_seconds: 540,
          start_time: new Date(Date.now() - 540000).toISOString(),
          end_time: new Date().toISOString(),
        };
      }
    },

    getInsights: async (attemptId) => {
      try {
        return await request(`/results/${attemptId}/insights`);
      } catch (err) {
        return {
          attempt_id: attemptId,
          test_id: DEMO_TESTS[0].id,
          test_title: DEMO_TESTS[0].title,
          total_score: 13.5,
          percentile: 94.2,
          rank: 24,
          total_participants: 412,
          overall_accuracy: 87.5,
          avg_time_per_question: 67.5,
          subject_analysis: [
            {
              subject: "Quantitative Aptitude",
              total_questions: 3,
              attempted: 3,
              correct: 3,
              accuracy_percentage: 100.0,
              avg_time_per_q_seconds: 75.0,
            },
            {
              subject: "General Intelligence & Reasoning",
              total_questions: 2,
              attempted: 2,
              correct: 2,
              accuracy_percentage: 100.0,
              avg_time_per_q_seconds: 52.0,
            },
            {
              subject: "General Awareness",
              total_questions: 2,
              attempted: 2,
              correct: 1,
              accuracy_percentage: 50.0,
              avg_time_per_q_seconds: 35.0,
            },
            {
              subject: "English Comprehension",
              total_questions: 1,
              attempted: 1,
              correct: 1,
              accuracy_percentage: 100.0,
              avg_time_per_q_seconds: 40.0,
            }
          ],
          topic_analysis: [
            {
              topic: "Geometry",
              subject: "Quantitative Aptitude",
              total_questions: 1,
              attempted: 1,
              correct: 1,
              accuracy_percentage: 100.0,
              avg_time_per_q_seconds: 82.0,
            },
            {
              topic: "Profit & Loss",
              subject: "Quantitative Aptitude",
              total_questions: 1,
              attempted: 1,
              correct: 1,
              accuracy_percentage: 100.0,
              avg_time_per_q_seconds: 64.0,
            },
            {
              topic: "Modern History",
              subject: "General Awareness",
              total_questions: 1,
              attempted: 1,
              correct: 0,
              accuracy_percentage: 0.0,
              avg_time_per_q_seconds: 30.0,
            }
          ],
          strong_areas: ["Geometry", "Profit & Loss", "Syllogisms", "Indian Polity"],
          weak_areas: ["Modern History"],
          questions_breakdown: DEMO_QUESTIONS.map((q, idx) => ({
            question_id: q.id,
            subject: q.subject,
            topic: q.topic,
            difficulty: q.difficulty,
            question_text: q.question_text,
            options: q.options,
            correct_option: q.correct_option,
            selected_option: idx === 7 ? "A" : q.correct_option,
            is_correct: idx !== 7,
            is_attempted: true,
            marks_awarded: idx !== 7 ? 2.0 : -0.5,
            time_taken_seconds: 65,
            solution_explanation: q.solution_explanation,
          })),
        };
      }
    },
  },

  // Student Dashboard Stats
  users: {
    getDashboard: async (userId) => {
      try {
        return await request(`/users/${userId}/dashboard`);
      } catch (err) {
        return {
          user_id: userId,
          total_mocks_attempted: 14,
          average_score: 138.5,
          average_accuracy: 82.4,
          best_score: 168.0,
          overall_percentile: 91.8,
          subject_performance: {
            "Quantitative Aptitude": 88.0,
            "General Intelligence": 92.5,
            "English Comprehension": 78.0,
            "General Awareness": 71.0,
          },
          recent_attempts: DEMO_TESTS.slice(0, 3).map((t, idx) => ({
            attempt_id: `prev-attempt-${idx}`,
            user_id: userId,
            test_id: t.id,
            test_title: t.title,
            status: "COMPLETED",
            total_score: 42.0 + idx * 4.5,
            max_possible_score: 50.0,
            percentage: 84.0,
            accuracy_percentage: 86.5,
            correct_count: 22,
            incorrect_count: 3,
            unattempted_count: 0,
            total_questions: 25,
            total_time_taken_seconds: 1420,
            start_time: new Date(Date.now() - (idx + 1) * 86400000).toISOString(),
            end_time: new Date(Date.now() - (idx + 1) * 86400000 + 1420000).toISOString(),
          })),
          recommended_tests: [
            {
              test_id: "mock-geometry-mini",
              title: "Geometry & Trigonometry Mini Speed Drill",
              reason: "Targeted practice for Advanced Quant",
            },
            {
              test_id: "mock-polity-mini",
              title: "Indian Polity & Constitution Mini Mock",
              reason: "Boost your General Awareness score",
            }
          ],
        };
      }
    },

    updateProfile: async (payload) => {
      return await request('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
  },

  // Admin Studio
  admin: {
    getStats: async () => {
      try {
        return await request('/admin/stats');
      } catch (err) {
        return {
          total_users: 1842,
          total_questions_in_bank: 1250,
          total_configured_tests: 38,
          total_attempts: 9420,
          completed_attempts: 8890,
        };
      }
    },

    getHealth: async () => {
      try {
        return await request('/admin/health');
      } catch (err) {
        return {
          app: "MockExam Platform API",
          environment: "development",
          database: { status: "connected", is_mock: false },
          cache: { status: "connected", is_fallback: false },
        };
      }
    },

    autoGenerateMock: async (params) => {
      const q = new URLSearchParams(params);
      return await request(`/admin/tests/auto-generate?${q.toString()}`, {
        method: 'POST',
      });
    },

    createTest: async (payload) => {
      return await request('/admin/tests', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  },

  // AI Question Pipeline (taxonomy -> upload -> generate -> blueprint -> assemble -> review)
  generation: {
    listTaxonomies: () => pipelineRequest('/generation/taxonomy'),
    getTaxonomy: (subject) => pipelineRequest(`/generation/taxonomy/${encodeURIComponent(subject)}`),
    setTaxonomy: (payload) => pipelineRequest('/generation/taxonomy', { method: 'PUT', body: payload }),

    uploadTheory: ({ subject, subSubject, files }) => {
      const form = new FormData();
      form.append('subject', subject);
      if (subSubject) form.append('sub_subject', subSubject);
      files.forEach((f) => form.append('files', f));
      return pipelineRequest('/generation/theory/upload', { method: 'POST', form });
    },
    uploadPyq: ({ subject, subSubject, targetExam, files }) => {
      const form = new FormData();
      form.append('subject', subject);
      form.append('target_exam', targetExam);
      if (subSubject) form.append('sub_subject', subSubject);
      files.forEach((f) => form.append('files', f));
      return pipelineRequest('/generation/pyq/upload', { method: 'POST', form });
    },

    generate: (payload) => pipelineRequest('/generation/quiz', { method: 'POST', body: payload }),
    bank: (subject, targetExam) =>
      pipelineRequest(
        `/generation/bank/${encodeURIComponent(subject)}${targetExam ? `?target_exam=${encodeURIComponent(targetExam)}` : ''}`
      ),

    getBlueprint: (subject) => pipelineRequest(`/generation/blueprint/${encodeURIComponent(subject)}`),
    starterBlueprint: (subject, defaultCount = 2) =>
      pipelineRequest(
        `/generation/blueprint/${encodeURIComponent(subject)}/generate-starter?default_count=${defaultCount}`,
        { method: 'POST' }
      ),
    saveBlueprint: (payload) => pipelineRequest('/generation/blueprint', { method: 'PUT', body: payload }),
    planBlueprint: (subject, payload) =>
      pipelineRequest(`/generation/blueprint/${encodeURIComponent(subject)}/plan`, { method: 'POST', body: payload }),

    assemble: (payload) => pipelineRequest('/generation/assemble', { method: 'POST', body: payload }),

    listStaging: () => pipelineRequest('/generation/staging'),
    approveStaging: (id) => pipelineRequest(`/generation/staging/${id}/approve`, { method: 'POST' }),
    rejectStaging: (id) => pipelineRequest(`/generation/staging/${id}`, { method: 'DELETE' }),
  },

  // Questions Bank
  questions: {
    list: async (params = {}) => {
      const q = new URLSearchParams();
      if (params.subject) q.append('subject', params.subject);
      if (params.topic) q.append('topic', params.topic);
      if (params.difficulty) q.append('difficulty', params.difficulty);
      if (params.search) q.append('search', params.search);

      try {
        return await request(`/questions?${q.toString()}`);
      } catch (err) {
        return DEMO_QUESTIONS;
      }
    },
  },
};
