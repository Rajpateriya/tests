/**
 * Centralized API Service for PrepMagnet Platform
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

// True when signed in against the real backend. The "Student/Admin" demo switch uses
// a fake token starting with "demo" and is the only case that should see demo data.
export const isRealSession = () => {
  const token = localStorage.getItem('govexam_token');
  return !!token && !token.startsWith('demo');
};

const SKIPS_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout', '/auth/forgot-password', '/auth/verify-reset-code', '/auth/reset-password'];

// A 401 is refreshed at most once at a time, even if several requests hit it together —
// they all wait on the same refresh and then retry with the new token.
let refreshInFlight = null;

async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refreshToken = localStorage.getItem('govexam_refresh_token');
    if (!refreshToken) return null;
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false || !json.data?.access_token) return null;
      localStorage.setItem('govexam_token', json.data.access_token);
      if (json.data.refresh_token) localStorage.setItem('govexam_refresh_token', json.data.refresh_token);
      return json.data.access_token;
    } catch {
      return null;
    }
  })();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

// The refresh token is dead too (expired, blacklisted, or there wasn't one): end the session
// client-side. AuthContext listens for this and clears user/token state without another API call.
function forceSessionExpired() {
  localStorage.removeItem('govexam_token');
  localStorage.removeItem('govexam_refresh_token');
  window.dispatchEvent(new Event('govexam:session-expired'));
}

// Generic fetch wrapper
async function request(endpoint, options = {}, _retried = false) {
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
      // Access token expired/invalid: try one silent refresh, then retry this call once.
      if (
        res.status === 401 &&
        !_retried &&
        !SKIPS_REFRESH.some((p) => endpoint.startsWith(p)) &&
        localStorage.getItem('govexam_refresh_token')
      ) {
        const newToken = await refreshAccessToken();
        if (newToken) return request(endpoint, options, true);
        forceSessionExpired();
      }
      const errorMsg = json?.error?.message || json?.detail || res.statusText || 'API request failed';
      const error = new Error(errorMsg);
      error.status = res.status;
      throw error;
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
async function pipelineRequest(endpoint, { method = 'GET', body, form } = {}, _retried = false) {
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
    // The pipeline can run long (uploads, generation): try one silent refresh on a 401, then retry.
    if (res.status === 401 && !_retried && localStorage.getItem('govexam_refresh_token')) {
      const newToken = await refreshAccessToken();
      if (newToken) return pipelineRequest(endpoint, { method, body, form }, true);
      forceSessionExpired();
    }
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

// Empty fallback datasets — no seeded or hardcoded data
export const DEMO_TESTS = [];
export const DEMO_QUESTIONS = [];

// Server-Sent Events over fetch (native EventSource can't send an Authorization header).
// Calls onEvent(event) for every pushed message, reconnects after a drop, and stops when
// `signal` is aborted. The caller re-reads state on each (re)connect, since events sent
// while disconnected are not replayed.
async function streamNotifications(onEvent, signal) {
  const RETRY_MS = 3000;
  const wait = (ms) =>
    new Promise((resolve) => {
      const timer = setTimeout(resolve, ms);
      signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
    });

  while (!signal.aborted) {
    try {
      const res = await fetch(`${BASE_URL}/notifications/stream`, {
        headers: { ...getAuthHeaders(), Accept: 'text/event-stream' },
        signal,
      });
      if (res.status === 401) {
        const newToken = await refreshAccessToken();
        if (!newToken) {
          forceSessionExpired();
          return;
        }
      } else if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let boundary;
          while ((boundary = buffer.indexOf('\n\n')) !== -1) {
            const block = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const data = block.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('');
            if (!data) continue; // heartbeat comment
            try {
              onEvent(JSON.parse(data));
            } catch {
              // ignore a malformed message
            }
          }
        }
      }
    } catch {
      if (signal.aborted) return;
    }
    await wait(RETRY_MS);
  }
}

// API Endpoints Mapping
export const api = {
  // Auth
  auth: {
    login: async (email, password, remember_me = false) => {
      return await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, remember_me }),
      });
    },

    register: async (payload) => {
      return await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    sendOtp: async (email) => {
      return await request('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },

    verifyOtp: async (email, otp) => {
      return await request('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
      });
    },

    forgotPassword: async (email) => {
      return await request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },

    verifyResetCode: async (email, reset_code) => {
      return await request('/auth/verify-reset-code', {
        method: 'POST',
        body: JSON.stringify({ email, reset_code }),
      });
    },

    resetPassword: async ({ email, reset_code, new_password }) => {
      return await request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, reset_code, new_password }),
      });
    },

    getMe: async () => {
      return await request('/auth/me');
    },

    // Blacklists the current access token server-side (and the refresh token, if there is
    // one), so neither can be used again even though they have not expired yet.
    logout: async (refreshToken) => {
      return await request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken || null }),
      });
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
      if (params.is_free !== undefined) q.append('is_free', params.is_free);

      const queryStr = q.toString() ? `?${q.toString()}` : '';
      return await request(`/tests${queryStr}`);
    },

    getDetails: async (testId) => {
      return await request(`/tests/${testId}`);
    },

    start: async (testId) => {
      return await request(`/tests/${testId}/start`, { method: 'POST' });
    },
  },

  // Attempts & Live Exam Room
  attempts: {
    getQuestions: async (attemptId) => {
      return await request(`/attempts/${attemptId}/questions`);
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
      return await request(`/attempts/${attemptId}/submit`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    pause: async (attemptId) => {
      return await request(`/attempts/${attemptId}/pause`, { method: 'POST' });
    },

    resume: async (attemptId) => {
      return await request(`/attempts/${attemptId}/resume`, { method: 'POST' });
    },
  },

  // Results & Analytics
  results: {
    getResult: async (attemptId) => {
      return await request(`/results/${attemptId}`);
    },

    getInsights: async (attemptId) => {
      return await request(`/results/${attemptId}/insights`);
    },
  },

  // Student Dashboard Stats
  users: {
    getDashboard: async (userId, courseId = null) => {
      try {
        const qs = courseId ? `?course_id=${encodeURIComponent(courseId)}` : '';
        return await request(`/users/${userId}/dashboard${qs}`);
      } catch (err) {
        return {
          user_id: userId,
          total_mocks_attempted: 0,
          average_score: 0.0,
          average_accuracy: 0.0,
          best_score: 0.0,
          overall_percentile: 0.0,
          current_streak_days: 0,
          coins_balance: 0,
          global_rank: 0,
          total_solved_questions: 0,
          total_available_questions: 0,
          difficulty_stats: {
            easy: { solved: 0, total: 0, accuracy: 0.0, beats_percentage: 0.0 },
            medium: { solved: 0, total: 0, accuracy: 0.0, beats_percentage: 0.0 },
            hard: { solved: 0, total: 0, accuracy: 0.0, beats_percentage: 0.0 },
          },
          subject_performance: {},
          recent_attempts: [],
          recommended_tests: [],
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
      return await request('/admin/stats');
    },

    // Support tickets: every ticket, from everyone (status is 'OPEN', 'RESOLVED', or omit for all)
    listSupportTickets: async ({ status = '', skip = 0, limit = 100 } = {}) => {
      const q = new URLSearchParams({ skip, limit });
      if (status) q.append('status', status);
      return await request(`/support/tickets?${q.toString()}`);
    },

    setSupportTicketStatus: async (ticketId, status, note) => {
      return await request(`/support/tickets/${ticketId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, note: note || null }),
      });
    },

    getHealth: async () => {
      return await request('/admin/health');
    },

    getUsers: async ({ page = 1, page_size = 10, search = '', role = '', is_active = '' } = {}) => {
      const q = new URLSearchParams();
      if (page) q.append('page', page);
      if (page_size) q.append('page_size', page_size);
      if (search && search.trim()) q.append('search', search.trim());
      if (role && role.trim()) q.append('role', role.trim());
      if (is_active !== undefined && is_active !== null && is_active !== '') {
        q.append('is_active', is_active);
      }
      return await request(`/admin/users?${q.toString()}`);
    },

    getUser: async (userId) => {
      return await request(`/admin/users/${userId}`);
    },

    updateUser: async (userId, payload) => {
      return await request(`/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    deleteUser: async (userId) => {
      return await request(`/admin/users/${userId}`, {
        method: 'DELETE',
      });
    },

    // Passes (admin): dynamic targeted exam passes with custom course coverage
    listPasses: async () => {
      return await request('/admin/passes');
    },

    createPass: async (payload) => {
      return await request('/admin/passes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    updatePass: async (passId, payload) => {
      return await request(`/admin/passes/${passId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    deletePass: async (passId) => {
      return await request(`/admin/passes/${passId}`, {
        method: 'DELETE',
      });
    },

    // Courses (admin): create a course, tag generated tests to it, edit, archive, see who enrolled
    listCourses: async ({ search = '', skip = 0, limit = 500 } = {}) => {
      const q = new URLSearchParams({ skip, limit });
      if (search && search.trim()) q.append('search', search.trim());
      return await request(`/courses/admin/all?${q.toString()}`);
    },

    // One course in full (drafts included): called each time a course is opened in Admin Studio
    getCourse: async (courseId) => {
      return await request(`/courses/admin/${courseId}`);
    },

    createCourse: async (payload) => {
      return await request('/courses', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    updateCourse: async (courseId, payload) => {
      return await request(`/courses/${courseId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    // Publish makes a draft course visible to users; unpublish takes it back to draft
    publishCourse: async (courseId) => {
      return await request(`/courses/${courseId}/publish`, { method: 'POST' });
    },

    unpublishCourse: async (courseId) => {
      return await request(`/courses/${courseId}/unpublish`, { method: 'POST' });
    },

    getCourseEnrollments: async (courseId) => {
      return await request(`/courses/${courseId}/enrollments`);
    },

    // Tests an admin can tag to a course: newest first, one page at a time, optional search
    // over every test's title and subject (done on the server, not just on what is loaded).
    listTests: async ({ search = '', skip = 0, limit = 20 } = {}) => {
      const q = new URLSearchParams({ skip, limit });
      if (search && search.trim()) q.append('search', search.trim());
      return await request(`/tests?${q.toString()}`);
    },

    // One test in full (inactive too) with the courses it is in; its questions with answers; edit; delete
    getTest: async (testId) => {
      return await request(`/admin/tests/${testId}`);
    },

    getTestQuestions: async (testId) => {
      return await request(`/admin/tests/${testId}/questions`);
    },

    updateTest: async (testId, payload) => {
      return await request(`/admin/tests/${testId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    deleteTest: async (testId) => {
      return await request(`/admin/tests/${testId}`, { method: 'DELETE' });
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
    // Existing GET /questions, in its paginated mode (`page` set): {items, total, page, page_size, pages}.
    browseQuestions: (params) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).trim() !== '') qs.append(key, value);
      });
      return pipelineRequest(`/questions?${qs.toString()}`);
    },
    bank: (subject, targetExam) =>
      pipelineRequest(
        `/generation/bank/${encodeURIComponent(subject)}${targetExam ? `?target_exam=${encodeURIComponent(targetExam)}` : ''}`
      ),

    getBlueprint: (subject, name) =>
      pipelineRequest(
        `/generation/blueprint/${encodeURIComponent(subject)}${name ? `?name=${encodeURIComponent(name)}` : ''}`
      ),
    listBlueprints: (subject) =>
      pipelineRequest(`/generation/blueprint/${encodeURIComponent(subject)}/list`),
    deleteBlueprint: (subject, name) =>
      pipelineRequest(
        `/generation/blueprint/${encodeURIComponent(subject)}?name=${encodeURIComponent(name)}`,
        { method: 'DELETE' }
      ),
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

      return await request(`/questions?${q.toString()}`);
    },
  },

  // Streak & Daily Quiz
  streak: {
    getStreak: async () => {
      return await request('/streak/me');
    },

    getDailyBoosterQuestions: async ({ count = 3, difficulty } = {}) => {
      const params = new URLSearchParams();
      if (count) params.append('count', count);
      if (difficulty) params.append('difficulty', difficulty);
      const qs = params.toString() ? `?${params.toString()}` : '';
      return await request(`/streak/daily-quiz/questions${qs}`);
    },

    verifyQuizAnswer: async ({ question_id, selected_option }) => {
      return await request('/streak/daily-quiz/verify-answer', {
        method: 'POST',
        body: JSON.stringify({ question_id, selected_option }),
      });
    },

    solveDailyQuiz: async ({ correct_count = 3, total_count = 3 } = {}) => {
      return await request('/streak/daily-quiz/solve', {
        method: 'POST',
        body: JSON.stringify({ correct_count, total_count }),
      });
    },
  },

  // Subscriptions & Dynamic Targeted Passes
  subscriptions: {
    getPasses: async () => {
      try {
        return await request('/subscriptions/passes');
      } catch (err) {
        return [];
      }
    },

    getMyPass: async () => {
      try {
        return await request('/subscriptions/my-pass');
      } catch (err) {
        return { has_active_pass: false, active_passes: [] };
      }
    },

    getPlans: async () => {
      try {
        return await request('/subscriptions/passes');
      } catch (err) {
        return [];
      }
    },

    calculateDiscount: async (planId, applyCoins = true) => {
      return await request('/subscriptions/calculate-discount', {
        method: 'POST',
        body: JSON.stringify({ plan_id: planId, apply_coins: applyCoins }),
      });
    },

    createOrder: async (planId, applyCoins = true) => {
      return await request('/subscriptions/create-order', {
        method: 'POST',
        body: JSON.stringify({ plan_id: planId, apply_coins: applyCoins }),
      });
    },

    verifyPayment: async (payload) => {
      return await request('/subscriptions/verify-payment', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    getMyStatus: async () => {
      try {
        return await request('/subscriptions/my-status');
      } catch (err) {
        return {
          plan: 'FREE',
          plan_name: 'Free Aspirant',
          status: 'INACTIVE',
          is_active: false,
          coins_balance: 0,
        };
      }
    },
  },

  // Exam-Oriented Courses & Razorpay Enrollment
  courses: {
    list: async (targetExam) => {
      const q = targetExam && targetExam !== 'All' ? `?target_exam=${encodeURIComponent(targetExam)}` : '';
      return await request(`/courses${q}`);
    },

    getDetail: async (courseId) => {
      return await request(`/courses/${courseId}`);
    },

    createOrder: async (courseId, applyCoins = true) => {
      return await request(`/courses/${courseId}/create-order`, {
        method: 'POST',
        body: JSON.stringify({ apply_coins: applyCoins }),
      });
    },

    verifyPayment: async (courseId, payload) => {
      return await request(`/courses/${courseId}/verify-payment`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    getMyEnrollments: async () => {
      return await request('/courses/my-enrollments');
    },

    enroll: async (courseId) => {
      return await request(`/courses/${courseId}/enroll`, {
        method: 'POST',
      });
    },
  },

  // Contact / support tickets
  support: {
    // Public: works signed in (ticket is linked to the user) or as a guest.
    submitTicket: async ({ name, email, subject, message }) => {
      return await request('/support/contact', {
        method: 'POST',
        body: JSON.stringify({ name, email, subject, message }),
      });
    },

    // Signed-in user: only the tickets they themselves raised.
    getMyTickets: async () => {
      return await request('/support/my-tickets');
    },
  },

  // In-app notifications (a student sees their own; an admin also sees admin-wide ones)
  notifications: {
    stream: streamNotifications,

    getMine: async (unreadOnly = false) => {
      return await request(`/notifications${unreadOnly ? '?unread_only=true' : ''}`);
    },

    getUnreadCount: async () => {
      return await request('/notifications/unread-count');
    },

    markRead: async (notificationId) => {
      return await request(`/notifications/${notificationId}/read`, { method: 'POST' });
    },

    markAllRead: async () => {
      return await request('/notifications/read-all', { method: 'POST' });
    },
  },

  // Typing Master Mock Test Engine
  typing: {
    getRandomPassage: async () => {
      return await request('/typing/random');
    },

    listPassages: async (examCategory) => {
      const q = examCategory && examCategory !== 'All' ? `?exam_category=${encodeURIComponent(examCategory)}` : '';
      return await request(`/typing/passages${q}`);
    },

    getPassage: async (passageId) => {
      return await request(`/typing/passages/${passageId}`);
    },

    createPassage: async (payload) => {
      return await request('/typing/passages', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    submitAttempt: async (payload) => {
      return await request('/typing/submit', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    getMyHistory: async () => {
      return await request('/typing/my-history');
    },
  },

  // Standard Razorpay Payment Gateway Endpoints
  payments: {
    createOrder: async ({ amount, currency = 'INR', receipt = null, notes = null }) => {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency,
          receipt,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || data?.message || 'Failed to create payment order');
      }
      return data;
    },

    verifyPayment: async ({ order_id, payment_id, signature }) => {
      const res = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: order_id,
          razorpay_payment_id: payment_id,
          razorpay_signature: signature,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || data?.message || 'Payment signature verification failed');
      }
      return data;
    },
  },

  // Multi-Course Cart & Bulk Checkout
  cart: {
    get: async () => request('/cart'),

    addItem: async (courseId) =>
      request('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ course_id: courseId }),
      }),

    removeItem: async (courseId) =>
      request(`/cart/items/${encodeURIComponent(courseId)}`, { method: 'DELETE' }),

    clear: async () => request('/cart', { method: 'DELETE' }),

    checkout: async (applyCoins = true) =>
      request('/cart/checkout', {
        method: 'POST',
        body: JSON.stringify({ apply_coins: applyCoins }),
      }),

    verifyPayment: async ({ order_id, payment_id, signature, coins_used = 0, course_ids = [] }) =>
      request('/cart/verify', {
        method: 'POST',
        body: JSON.stringify({ order_id, payment_id, signature, coins_used, course_ids }),
      }),
  },
};
