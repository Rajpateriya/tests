import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ShieldIcon,
  UserIcon,
  CpuIcon,
  LayersIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
  SearchIcon,
  RefreshCwIcon,
  EditIcon,
  TrashIcon,
  UserCheckIcon,
  UserXIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CrownIcon,
  FlameIcon,
  LockIcon,
  CheckIcon,
  BookOpenIcon,
  PlusIcon,
} from '../components/Icons';

const EXAM_OPTIONS = [
  'SSC CGL',
  'SSC CHSL',
  'IBPS PO / Banking',
  'RRB NTPC',
  'State PSC',
  'UPSC CSAT',
  'Defence / CDS',
];

const INPUT_CLS =
  'w-full px-3 py-2 rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-institutional-500';

const EMPTY_COURSE_FORM = {
  title: '',
  description: '',
  target_exam: 'SSC CGL',
  original_price: '',
  discounted_price: '',
  test_ids: [],
};

// Tests tagged to a course: its quizzes without embedded questions (quiz id = test id).
const taggedQuizzes = (course) => (course?.quizzes || []).filter((q) => !(q.questions && q.questions.length));

// Draft = made but not published (invisible to users); Archived = taken off the catalogue.
const courseStatus = (c) => {
  if (!c.is_active) {
    return { label: 'Archived', cls: 'bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-500 dark:text-charcoal-400' };
  }
  if (c.is_published === false) {
    return { label: 'Draft', cls: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' };
  }
  return { label: 'Published', cls: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' };
};

// Publish / Unpublish use the same outline style as the other row buttons (Open, Archive):
// green outline to publish a draft, amber outline to take it back.
const PUBLISH_BTN = (c) =>
  c.is_published === false
    ? 'border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
    : 'border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50';

const TEST_PAGE_SIZE = 20; // tests loaded per scroll in the course test picker
const SCROLL_THROTTLE_MS = 150; // the test list checks "near the bottom?" at most this often

// A search box asks the server only after the typing has stopped for this long.
const SEARCH_DEBOUNCE_MS = 1000;

// The value only follows `value` once it has stopped changing for `delay` ms. Every new change
// (every letter typed) cancels the pending wait and starts it again from zero.
function useDebouncedValue(value, delay = SEARCH_DEBOUNCE_MS) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// Pages through the tests, newest first, 20 at a time. Scrolling near the bottom loads the next page
// (throttled, one request at a time); typing in the search box searches ALL tests on the server once
// the typing has paused (debounced). `active` switches it on, e.g. while a tab or page is open.
function usePagedList(active, onError, fetchPage, noun) {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search); // what is actually sent to the server
  const request = useRef(0); // ignores answers to outdated requests (e.g. the search changed)
  const fetching = useRef(false); // a page request is in flight (checked synchronously by the scroll handler)
  const scrollTimer = useRef(null); // pending throttled scroll check
  const latest = useRef({}); // newest values, for timers created in an earlier render
  latest.current = { count: tests.length, search: debouncedSearch, hasMore, onError };

  // `reset` starts again from the newest test; otherwise the next page is appended.
  const load = async (reset) => {
    const mine = ++request.current;
    fetching.current = true; // set at once (state would only change after a re-render)
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const { count, search: term } = latest.current;
      const page = await fetchPage({ search: term, skip: reset ? 0 : count, limit: TEST_PAGE_SIZE });
      if (mine !== request.current) return;
      setTests((prev) => {
        if (reset) return page;
        const have = new Set(prev.map((t) => t.id));
        return [...prev, ...page.filter((t) => !have.has(t.id))];
      });
      setHasMore(page.length === TEST_PAGE_SIZE);
    } catch (err) {
      if (mine === request.current) latest.current.onError?.(`Could not load ${noun}: ${err.message}`);
    } finally {
      if (mine === request.current) {
        fetching.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  // Scrolling fires many events a second, so instead of reacting to each one, check the position
  // once per window (trailing, so the final resting position is what is checked).
  const onScroll = (e) => {
    const el = e.currentTarget;
    if (scrollTimer.current) return; // a check is already scheduled
    scrollTimer.current = setTimeout(() => {
      scrollTimer.current = null;
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 80;
      if (nearBottom && latest.current.hasMore && !fetching.current) load(false);
    }, SCROLL_THROTTLE_MS);
  };

  useEffect(() => {
    if (active) load(true);
  }, [active, debouncedSearch]);

  useEffect(() => () => clearTimeout(scrollTimer.current), []);

  return {
    tests,
    loading,
    loadingMore,
    hasMore,
    search,
    setSearch,
    pending: search.trim() !== debouncedSearch.trim(), // still waiting for typing to stop
    onScroll,
    reload: () => load(true),
  };
}

const usePagedTests = (active, onError) => usePagedList(active, onError, api.admin.listTests, 'tests');
const usePagedCourses = (active, onError) => usePagedList(active, onError, api.admin.listCourses, 'courses');

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

// Admin Studio addresses: /admin/users, /admin/courses, /admin/tests, /admin/tests/<test id>, /admin/health
const ADMIN_TABS = ['users', 'courses', 'tests', 'health'];
const parseAdminPath = () => {
  const [, , tab, id] = window.location.pathname.split('/');
  return {
    tab: ADMIN_TABS.includes(tab) ? tab : 'users',
    testId: tab === 'tests' && id ? id : null,
    courseId: tab === 'courses' && id ? id : null, // a course id, or 'new'
  };
};

export const AdminStudioPage = () => {
  const { user: currentAdmin } = useAuth();
  const bootPath = useRef(parseAdminPath()); // where the page was opened (a refresh or shared link)
  const [activeTab, setActiveTab] = useState(bootPath.current.tab); // 'users' | 'courses' | 'tests' | 'health'

  // Admin stats & health
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Paginated Users State (10 items per page)
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedUserSearch = useDebouncedValue(searchQuery); // what is actually sent to the server
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Edit User Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    role: 'student',
    is_active: true,
    coins_balance: 150,
    subscription_plan: 'FREE',
    subscription_status: 'INACTIVE',
    target_exams: [],
    phone_number: '',
    password: '',
  });
  const [savingUser, setSavingUser] = useState(false);
  const [toast, setToast] = useState(null);

  // Courses: list, create/edit modal (with the generated tests tagged to the course), enrolled users
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [courseModal, setCourseModal] = useState(null); // null | { mode: 'create' } | { mode: 'edit', course }
  const [courseForm, setCourseForm] = useState(EMPTY_COURSE_FORM);
  // The course test picker and the Mock Tests tab each page through the tests with their own state.
  const picker = usePagedTests(!!courseModal, (msg) => showToast('error', msg));
  const testsTab = usePagedTests(activeTab === 'tests', (msg) => showToast('error', msg));
  // The Courses table pages and searches on the server; `courses` above stays the full list (counts, test tags).
  const coursesTab = usePagedCourses(activeTab === 'courses' && !courseModal, (msg) => showToast('error', msg));
  const {
    tests: availableTests,
    loading: testsLoading,
    loadingMore: testsLoadingMore,
    hasMore: testsHasMore,
    search: testSearch,
    setSearch: setTestSearch,
    pending: testSearchPending,
    onScroll: handleTestListScroll,
  } = picker;
  const [savingCourse, setSavingCourse] = useState(false);
  const [courseDetailLoading, setCourseDetailLoading] = useState(false); // the detail call for an opened course is running
  const [enrolledModal, setEnrolledModal] = useState(null); // { course, users, loading }

  // Mock Tests: the opened test's page (edit form, questions, delete)
  const [testDetail, setTestDetail] = useState(null); // null | { test, questions, loading }
  const [testForm, setTestForm] = useState(null);
  const [savingTest, setSavingTest] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingTest, setDeletingTest] = useState(false);

  // Show auto-dismissing toast
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Header numbers: loaded with the page. The health report belongs to the Infrastructure tab, so it is
  // fetched only when that tab is opened (or refreshed there).
  const loadOverviewData = async () => {
    setLoadingOverview(true);
    try {
      setStats(await api.admin.getStats());
    } catch (err) {
      console.warn('Overview data fetch error:', err.message);
    } finally {
      setLoadingOverview(false);
    }
  };

  const loadHealth = async () => {
    try {
      setHealth(await api.admin.getHealth());
    } catch (err) {
      console.warn('Health fetch error:', err.message);
    }
  };

  // Fetch paginated users from backend
  const fetchUsers = useCallback(async (page = 1) => {
    setUsersLoading(true);
    try {
      const is_active = statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : '';
      const res = await api.admin.getUsers({
        page,
        page_size: 10,
        search: debouncedUserSearch,
        role: roleFilter,
        is_active,
      });
      setUsers(res.items || []);
      setTotalUsers(res.total || 0);
      setCurrentPage(res.page || 1);
      setTotalPages(res.total_pages || 1);
    } catch (err) {
      showToast('error', `Failed to load users: ${err.message}`);
    } finally {
      setUsersLoading(false);
    }
  }, [debouncedUserSearch, roleFilter, statusFilter]);

  useEffect(() => {
    loadOverviewData();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers(currentPage); // the user list is only needed on its own tab
  }, [fetchUsers, currentPage, activeTab]);

  // Open Edit User Modal
  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name || '',
      email: user.email || '',
      role: user.role || 'student',
      is_active: user.is_active !== undefined ? user.is_active : true,
      coins_balance: user.profile?.coins_balance ?? 150,
      subscription_plan: user.profile?.subscription_plan || 'FREE',
      subscription_status: user.profile?.subscription_status || 'INACTIVE',
      target_exams: user.profile?.target_exams || ['SSC CGL'],
      phone_number: user.profile?.phone_number || '',
      password: '',
    });
  };

  // Save changes to user profile
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSavingUser(true);
    try {
      const payload = {
        full_name: editForm.full_name,
        email: editForm.email,
        role: editForm.role,
        is_active: editForm.is_active,
        coins_balance: parseInt(editForm.coins_balance, 10),
        subscription_plan: editForm.subscription_plan,
        subscription_status: editForm.subscription_status,
        target_exams: editForm.target_exams,
        phone_number: editForm.phone_number || null,
      };
      if (editForm.password && editForm.password.trim().length >= 6) {
        payload.password = editForm.password.trim();
      }

      const updated = await api.admin.updateUser(selectedUser.id, payload);
      showToast('success', `User "${updated.full_name}" updated successfully!`);
      setSelectedUser(null);
      fetchUsers(currentPage);
      loadOverviewData();
    } catch (err) {
      showToast('error', `Update failed: ${err.message}`);
    } finally {
      setSavingUser(false);
    }
  };

  // Quick toggle role between student and admin
  const handleToggleRole = async (user) => {
    const isSelf = currentAdmin?.id === user.id || currentAdmin?.email === user.email;
    if (isSelf) {
      showToast('error', 'You cannot alter your own administrator role.');
      return;
    }
    const newRole = user.role === 'admin' ? 'student' : 'admin';
    const actionLabel = newRole === 'admin' ? 'promote to Administrator' : 'demote to Student';
    if (!window.confirm(`Are you sure you want to ${actionLabel} for "${user.full_name}"?`)) {
      return;
    }

    try {
      await api.admin.updateUser(user.id, { role: newRole });
      showToast('success', `Role for "${user.full_name}" set to ${newRole.toUpperCase()}`);
      fetchUsers(currentPage);
    } catch (err) {
      showToast('error', `Role change failed: ${err.message}`);
    }
  };

  // Quick toggle active / suspended status
  const handleToggleStatus = async (user) => {
    const isSelf = currentAdmin?.id === user.id || currentAdmin?.email === user.email;
    if (isSelf) {
      showToast('error', 'You cannot deactivate your own account.');
      return;
    }
    const newStatus = !user.is_active;
    try {
      await api.admin.updateUser(user.id, { is_active: newStatus });
      showToast('success', `User "${user.full_name}" is now ${newStatus ? 'ACTIVE' : 'SUSPENDED'}`);
      fetchUsers(currentPage);
    } catch (err) {
      showToast('error', `Status change failed: ${err.message}`);
    }
  };

  // Delete User
  const handleDeleteUser = async (user) => {
    const isSelf = currentAdmin?.id === user.id || currentAdmin?.email === user.email;
    if (isSelf) {
      showToast('error', 'You cannot delete your own account.');
      return;
    }
    if (!window.confirm(`Permanently delete account for "${user.full_name}" (${user.email})? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.admin.deleteUser(user.id);
      showToast('success', `Account for "${user.full_name}" deleted.`);
      fetchUsers(currentPage);
      loadOverviewData();
    } catch (err) {
      showToast('error', `Delete failed: ${err.message}`);
    }
  };

  const toggleExamInEdit = (exam) => {
    setEditForm((prev) => {
      const exists = prev.target_exams.includes(exam);
      if (exists) {
        return {
          ...prev,
          target_exams: prev.target_exams.length > 1 ? prev.target_exams.filter((e) => e !== exam) : prev.target_exams,
        };
      }
      return { ...prev, target_exams: [...prev.target_exams, exam] };
    });
  };

  // ── Courses ──
  const loadCourses = async (reloadTable = false) => {
    setCoursesLoading(true);
    try {
      setCourses(await api.admin.listCourses());
      if (reloadTable) coursesTab.reload();
    } catch (err) {
      showToast('error', `Could not load courses: ${err.message}`);
    } finally {
      setCoursesLoading(false);
    }
  };

  const openCreateCourse = () => {
    setCourseForm(EMPTY_COURSE_FORM);
    setTestSearch('');
    setCourseModal({ mode: 'create' });
  };

  const formFromCourse = (course) => ({
    title: course.title,
    description: course.description || '',
    target_exam: course.target_exam,
    original_price: course.original_price,
    discounted_price: course.discounted_price,
    // A tagged test is a course quiz with no embedded questions; its quiz id is the test id.
    // (Built-in quizzes carry their own questions and are not part of this list.)
    test_ids: taggedQuizzes(course).map((q) => q.id),
  });

  // Opening a course calls the course detail API, so the page always shows the course as it is now
  // (not the copy the list loaded earlier). The list's copy is shown straight away meanwhile.
  const openEditCourse = async (course) => {
    setCourseForm(formFromCourse(course));
    setTestSearch('');
    setCourseModal({ mode: 'edit', course });
    setCourseDetailLoading(true);
    try {
      const fresh = await api.admin.getCourse(course.id);
      setCourseModal((m) => (m && m.mode === 'edit' && m.course.id === course.id ? { ...m, course: fresh } : m));
      setCourseForm(formFromCourse(fresh));
    } catch (err) {
      showToast('error', `Could not load the course: ${err.message}`);
      setCourseModal((m) => (m && m.mode === 'edit' && m.course.id === course.id && !m.course.title ? null : m));
    } finally {
      setCourseDetailLoading(false);
    }
  };

  // A course opened by address (refresh / shared link): show a blank shell, then the detail call fills it in.
  const openCourseById = async (id) => {
    await openEditCourse({
      id, title: '', description: '', target_exam: 'SSC CGL', original_price: '', discounted_price: '',
      quizzes: [], is_active: true, enrolled_count: 0,
    });
  };

  const toggleCourseTest = (testId) => {
    setCourseForm((prev) => ({
      ...prev,
      test_ids: prev.test_ids.includes(testId)
        ? prev.test_ids.filter((id) => id !== testId)
        : [...prev.test_ids, testId],
    }));
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    const original = Number(courseForm.original_price);
    const discounted = Number(courseForm.discounted_price);
    if (!(original > 0) || !(discounted > 0)) {
      showToast('error', 'Enter both prices above 0.');
      return;
    }
    if (discounted > original) {
      showToast('error', 'The discounted price cannot be higher than the original price.');
      return;
    }

    const payload = {
      title: courseForm.title.trim(),
      description: courseForm.description.trim(),
      target_exam: courseForm.target_exam,
      original_price: original,
      discounted_price: discounted,
    };

    setSavingCourse(true);
    try {
      if (courseModal.mode === 'create') {
        await api.admin.createCourse({ ...payload, test_ids: courseForm.test_ids });
        showToast('success', `Course "${payload.title}" created as a draft. Press Publish when it is ready for users.`);
      } else {
        await api.admin.updateCourse(courseModal.course.id, { ...payload, test_ids: courseForm.test_ids });
        showToast('success', `Course "${payload.title}" updated.`);
      }
      setCourseModal(null);
      coursesLoaded.current = false; // the Mock Tests tab refetches its course tags next time
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSavingCourse(false);
    }
  };

  const handleTogglePublish = async (course) => {
    const publishing = course.is_published === false;
    try {
      const updated = publishing ? await api.admin.publishCourse(course.id) : await api.admin.unpublishCourse(course.id);
      showToast(
        'success',
        publishing ? `"${course.title}" is now published and visible to users.` : `"${course.title}" is back to draft.`
      );
      // Keep an open details pop-up in step with the new status
      setCourseModal((m) => (m && m.mode === 'edit' && m.course.id === course.id ? { ...m, course: updated } : m));
      coursesLoaded.current = false;
      coursesTab.reload();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleToggleCourseActive = async (course) => {
    try {
      await api.admin.updateCourse(course.id, { is_active: !course.is_active });
      showToast('success', course.is_active ? `"${course.title}" archived.` : `"${course.title}" restored.`);
      coursesLoaded.current = false;
      coursesTab.reload();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const openEnrolledUsers = async (course) => {
    setEnrolledModal({ course, users: [], loading: true });
    try {
      const users = await api.admin.getCourseEnrollments(course.id);
      setEnrolledModal({ course, users, loading: false });
    } catch (err) {
      showToast('error', `Could not load enrolled users: ${err.message}`);
      setEnrolledModal(null);
    }
  };

  // ── Mock test page: open, edit, delete ──
  const formFromTest = (t) => ({
    title: t.title ?? '',
    description: t.description || '',
    duration_minutes: t.duration_minutes ?? '',
    positive_marks_per_q: t.positive_marks_per_q ?? '',
    negative_marks_per_q: t.negative_marks_per_q ?? '',
  });

  const openTest = async (t) => {
    setConfirmDelete(false);
    setTestForm(formFromTest(t));
    setTestDetail({ test: t, questions: [], loading: true });
    try {
      const [fresh, questions] = await Promise.all([api.admin.getTest(t.id), api.admin.getTestQuestions(t.id)]);
      setTestDetail({ test: fresh, questions, loading: false });
      setTestForm(formFromTest(fresh));
    } catch (err) {
      showToast('error', `Could not load the test: ${err.message}`);
      setTestDetail(null);
      if (window.location.pathname.startsWith('/admin/tests/')) window.history.replaceState(null, '', '/admin/tests');
    }
  };

  const closeTest = () => {
    setTestDetail(null);
    setConfirmDelete(false);
    testsTab.reload();
  };

  const handleSaveTest = async (e) => {
    e.preventDefault();
    const duration = Number(testForm.duration_minutes);
    const positive = Number(testForm.positive_marks_per_q);
    const negative = Number(testForm.negative_marks_per_q);
    if (!(duration >= 1) || !Number.isInteger(duration)) {
      showToast('error', 'Duration must be a whole number of minutes, 1 or more.');
      return;
    }
    if (!(positive > 0) || !(negative >= 0)) {
      showToast('error', 'Marks for a correct answer must be above 0, and the penalty 0 or more.');
      return;
    }
    setSavingTest(true);
    try {
      const updated = await api.admin.updateTest(testDetail.test.id, {
        title: testForm.title.trim(),
        description: testForm.description.trim(),
        duration_minutes: duration,
        positive_marks_per_q: positive,
        negative_marks_per_q: negative,
      });
      setTestDetail((d) => ({ ...d, test: updated }));
      setTestForm(formFromTest(updated));
      showToast('success', `Test "${updated.title}" updated${updated.courses.length ? ' in its courses too' : ''}.`);
      await loadCourses();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSavingTest(false);
    }
  };

  const handleDeleteTest = async () => {
    setDeletingTest(true);
    try {
      const r = await api.admin.deleteTest(testDetail.test.id);
      const drafted = r.unpublished_courses.length
        ? ` ${r.unpublished_courses.join(', ')} had no tests left and went back to draft.`
        : '';
      showToast('success', `"${r.title}" deleted${r.removed_from_courses.length ? ' and removed from its courses' : ''}.${drafted}`);
      setTestDetail(null);
      setConfirmDelete(false);
      testsTab.reload();
      await loadCourses();
      loadOverviewData();
    } catch (err) {
      setConfirmDelete(false);
      showToast('error', err.message);
    } finally {
      setDeletingTest(false);
    }
  };

  // Address bar <-> tab / open test. The first run only tidies the address (no extra history entry).
  const addressSynced = useRef(false);
  useEffect(() => {
    const first = !addressSynced.current;
    addressSynced.current = true;
    if (first && (bootPath.current.testId || bootPath.current.courseId)) return; // the address already names it
    const courseKey = courseModal ? (courseModal.mode === 'create' ? 'new' : courseModal.course.id) : null;
    const want = `/admin/${activeTab}${
      activeTab === 'tests' && testDetail ? `/${testDetail.test.id}` : activeTab === 'courses' && courseKey ? `/${courseKey}` : ''
    }`;
    if (window.location.pathname !== want) window.history[first ? 'replaceState' : 'pushState'](null, '', want);
  }, [activeTab, testDetail?.test.id, courseModal?.mode, courseModal?.course?.id]);

  // Opened on a test's address (refresh or shared link): open that test
  useEffect(() => {
    const { testId, courseId } = bootPath.current;
    if (testId) openTest({ id: testId });
    if (courseId === 'new') openCreateCourse();
    else if (courseId) openCourseById(courseId);
  }, []);

  // Back/forward: follow the address
  const onAddressChange = useRef(null);
  onAddressChange.current = () => {
    const { tab, testId, courseId } = parseAdminPath();
    setActiveTab(tab);
    if (courseId) {
      if (courseId === 'new') {
        if (courseModal?.mode !== 'create') openCreateCourse();
      } else if (courseModal?.course?.id !== courseId) openCourseById(courseId);
    } else if (courseModal) {
      setCourseModal(null);
    }
    if (testId) {
      if (testDetail?.test.id !== testId) openTest({ id: testId });
    } else if (testDetail) {
      setTestDetail(null);
      setConfirmDelete(false);
      testsTab.reload();
    }
  };
  useEffect(() => {
    const handler = () => onAddressChange.current();
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  // Each tab fetches its own data the first time it is opened, not when the page loads.
  // (Only the Mock Tests tab needs the full course list, for its "In Courses" column.)
  const coursesLoaded = useRef(false);
  const healthLoaded = useRef(false);
  useEffect(() => {
    if (activeTab === 'tests' && !coursesLoaded.current) {
      coursesLoaded.current = true;
      loadCourses();
    }
    if (activeTab === 'health' && !healthLoaded.current) {
      healthLoaded.current = true;
      loadHealth();
    }
  }, [activeTab]);

  // The picker shows the loaded pages, plus the tests already tagged to this course that are not
  // loaded yet (matching the search), so a tagged test can always be un-ticked.
  const pickerTests = (() => {
    const known = new Set(availableTests.map((t) => t.id));
    const term = testSearch.trim().toLowerCase();
    const tagged = courseModal?.course
      ? taggedQuizzes(courseModal.course)
          .filter((q) => !known.has(q.id))
          .filter((q) => !term || q.title?.toLowerCase().includes(term) || q.subject?.toLowerCase().includes(term))
          .map((q) => ({
            id: q.id,
            title: q.title,
            subject: q.subject,
            total_questions: q.total_questions,
            duration_minutes: q.duration_minutes,
          }))
      : [];
    return [...tagged, ...availableTests];
  })();

  // For the Mock Tests tab: which courses each test is tagged to (from the course list already loaded)
  const testCourses = {};
  courses.forEach((c) =>
    taggedQuizzes(c).forEach((q) => {
      (testCourses[q.id] = testCourses[q.id] || []).push(c.title);
    })
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7 font-sans text-charcoal-900 dark:text-charcoal-100">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-fade-in max-w-md shadow-2xl">
          <div
            className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-3 backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/90 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircleIcon size={18} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangleIcon size={18} className="text-rose-600 shrink-0" />
            )}
            <span className="leading-snug">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-6 sm:p-8 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-1.5 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-institutional-50 dark:bg-institutional-950/60 text-institutional-700 dark:text-institutional-300 border border-institutional-200 dark:border-institutional-800 text-xs font-extrabold uppercase tracking-wider">
            <ShieldIcon size={14} />
            <span>PrepMagnet Admin Studio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-charcoal-950 dark:text-white">
            Administrative Command & User Governance Studio
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-500 dark:text-charcoal-400 max-w-2xl leading-relaxed">
            Real-time candidate profile management, role elevation, course management, and live platform telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 relative z-10">
          <button
            onClick={() => {
              loadOverviewData();
              if (activeTab === 'users') fetchUsers(currentPage);
              if (activeTab === 'tests') loadCourses();
              if (activeTab === 'courses') coursesTab.reload();
              if (activeTab === 'tests') testsTab.reload();
              if (activeTab === 'health') loadHealth();
              showToast('success', 'Admin studio synchronized with backend.');
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-charcoal-300 dark:border-charcoal-700 text-xs font-bold text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-50 dark:hover:bg-charcoal-800 transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCwIcon size={14} className={loadingOverview || usersLoading ? 'animate-spin' : ''} />
            <span>Sync Live Data</span>
          </button>
        </div>
      </div>

      {/* 4 Live Stats Cards (all numbers from the backend); each opens its tab */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { key: 'users', label: 'Total Users', value: stats?.total_users, Icon: UserIcon, tab: 'users', box: 'bg-institutional-100 dark:bg-institutional-900/60 text-institutional-700 dark:text-institutional-300' },
          { key: 'courses', label: 'Courses', value: stats?.total_courses, Icon: BookOpenIcon, tab: 'courses', box: 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300' },
          { key: 'tests', label: 'Configured Tests', value: stats?.total_configured_tests, Icon: LayersIcon, tab: 'tests', box: 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300' },
          { key: 'attempts', label: 'Completed Attempts', value: stats?.completed_attempts, Icon: CheckCircleIcon, tab: null, box: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300', green: true },
        ].map(({ key, label, value, Icon, tab, box, green }) => {
          const body = (
            <>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${box}`}>
                <Icon size={24} />
              </div>
              <div className="text-left">
                <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">{label}</div>
                <div className={`text-2xl font-extrabold font-mono ${green ? 'text-emerald-600 dark:text-emerald-400' : 'text-charcoal-900 dark:text-charcoal-100'}`}>
                  {value ?? (loadingOverview ? '...' : 0)}
                </div>
              </div>
            </>
          );
          const base = 'bg-white dark:bg-charcoal-900 border rounded-2xl p-5 shadow-subtle flex items-center gap-4 w-full';
          return tab ? (
            <button
              key={key}
              type="button"
              onClick={() => {
                setCourseModal(null); // leave an open course / test page and show the list
                setTestDetail(null);
                setActiveTab(tab);
              }}
              title={`Open ${label}`}
              className={`${base} cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
                activeTab === tab
                  ? 'border-institutional-400 dark:border-institutional-600'
                  : 'border-charcoal-200 dark:border-charcoal-800 hover:border-institutional-300 dark:hover:border-institutional-700'
              }`}
            >
              {body}
            </button>
          ) : (
            <div key={key} className={`${base} border-charcoal-200 dark:border-charcoal-800`}>{body}</div>
          );
        })}
      </div>

      {/* Main Studio Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-charcoal-200 dark:border-charcoal-800 pb-2 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'users'
              ? 'bg-institutional-600 text-white shadow-sm font-extrabold'
              : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-white hover:bg-charcoal-100 dark:hover:bg-charcoal-800'
          }`}
        >
          <UserIcon size={15} />
          <span>User Profiles & Governance ({totalUsers})</span>
        </button>

        <button
          onClick={() => setActiveTab('courses')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'courses'
              ? 'bg-institutional-600 text-white shadow-sm font-extrabold'
              : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-white hover:bg-charcoal-100 dark:hover:bg-charcoal-800'
          }`}
        >
          <BookOpenIcon size={15} />
          <span>Courses ({stats?.total_courses ?? '...'})</span>
        </button>

        <button
          onClick={() => setActiveTab('tests')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'tests'
              ? 'bg-institutional-600 text-white shadow-sm font-extrabold'
              : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-white hover:bg-charcoal-100 dark:hover:bg-charcoal-800'
          }`}
        >
          <LayersIcon size={15} />
          <span>Mock Tests ({stats?.total_configured_tests ?? '...'})</span>
        </button>

        <button
          onClick={() => setActiveTab('health')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'health'
              ? 'bg-institutional-600 text-white shadow-sm font-extrabold'
              : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-white hover:bg-charcoal-100 dark:hover:bg-charcoal-800'
          }`}
        >
          <CpuIcon size={15} />
          <span>Infrastructure & Telemetry</span>
        </button>
      </div>

      {/* TAB 1: USER PROFILES & GOVERNANCE (Tabulate Dashboard Paginated 10 per page) */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-6 shadow-card space-y-6 animate-fade-in">
          {/* Header Controls: Search & Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-charcoal-150 dark:border-charcoal-800">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-charcoal-950 dark:text-white flex items-center gap-2">
                <span>User Profiles & Role Directory</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-institutional-100 dark:bg-institutional-950 text-institutional-700 dark:text-institutional-300 font-mono font-bold">
                  {totalUsers} Registered
                </span>
              </h2>
              <p className="text-xs text-charcoal-500 dark:text-charcoal-400 mt-0.5">
                Paginated live API of 10 users per page. Inspect candidate analytics, grant administrator privileges, or modify preferences.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search input */}
              <div className="relative">
                <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 pr-3.5 py-2 text-xs rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-institutional-500 w-56 sm:w-64"
                />
              </div>

              {/* Role filter */}
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs font-bold rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-800 dark:text-charcoal-200 focus:outline-none cursor-pointer"
              >
                <option value="">All Roles</option>
                <option value="student">Student Aspirants</option>
                <option value="admin">Administrators</option>
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs font-bold rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-800 dark:text-charcoal-200 focus:outline-none cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Suspended Only</option>
              </select>
            </div>
          </div>

          {/* Tabulate Dashboard Table */}
          <div className="overflow-x-auto rounded-2xl border border-charcoal-200 dark:border-charcoal-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-charcoal-50 dark:bg-charcoal-850/80 border-b border-charcoal-200 dark:border-charcoal-800 text-charcoal-500 dark:text-charcoal-400 font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Candidate Profile</th>
                  <th className="py-3 px-3">Role & Access</th>
                  <th className="py-3 px-3">Account Status</th>
                  <th className="py-3 px-3">Exam Focus</th>
                  <th className="py-3 px-3">Coins & Streak</th>
                  <th className="py-3 px-3">Subscription</th>
                  <th className="py-3 px-3">Joined On</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-150 dark:divide-charcoal-800 font-semibold">
                {usersLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-charcoal-400">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-institutional-600 border-t-transparent rounded-full animate-spin" />
                        <span>Loading live user directory from backend...</span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-charcoal-400">
                      No candidate profiles found matching your search and filter criteria.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isSelf = currentAdmin?.id === u.id || currentAdmin?.email === u.email;
                    const initials = u.full_name
                      ?.split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'PM';

                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-charcoal-50/60 dark:hover:bg-charcoal-850/50 transition-colors"
                      >
                        {/* 1. Candidate Profile */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-institutional-600 to-blue-500 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 shadow-xs">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-extrabold text-charcoal-900 dark:text-white flex items-center gap-1.5 truncate">
                                <span>{u.full_name}</span>
                                {isSelf && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-institutional-100 dark:bg-institutional-950 text-institutional-700 dark:text-institutional-300 font-mono font-bold">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-charcoal-400 font-mono truncate">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Role & Access */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                u.role === 'admin'
                                  ? 'bg-institutional-100 dark:bg-institutional-950/80 text-institutional-700 dark:text-institutional-300 border border-institutional-200 dark:border-institutional-800'
                                  : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              }`}
                            >
                              {u.role === 'admin' ? <ShieldIcon size={11} /> : <UserIcon size={11} />}
                              <span>{u.role}</span>
                            </span>

                            {!isSelf && (
                              <button
                                onClick={() => handleToggleRole(u)}
                                title={u.role === 'admin' ? 'Demote to Student' : 'Make Administrator'}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                                  u.role === 'admin'
                                    ? 'border-charcoal-300 dark:border-charcoal-700 text-charcoal-600 dark:text-charcoal-400 hover:bg-charcoal-100 dark:hover:bg-charcoal-800'
                                    : 'border-institutional-300 dark:border-institutional-700 bg-institutional-50 dark:bg-institutional-950 text-institutional-700 dark:text-institutional-300 hover:bg-institutional-100 dark:hover:bg-institutional-900'
                                }`}
                              >
                                {u.role === 'admin' ? 'Make Student' : '⚡ Make Admin'}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 3. Account Status */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                                u.is_active
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  u.is_active ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                              />
                              <span>{u.is_active ? 'Active' : 'Suspended'}</span>
                            </span>

                            {!isSelf && (
                              <button
                                onClick={() => handleToggleStatus(u)}
                                className="text-[10px] font-semibold text-charcoal-400 hover:text-charcoal-700 dark:hover:text-charcoal-200 underline cursor-pointer"
                              >
                                {u.is_active ? 'Suspend' : 'Activate'}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 4. Exam Focus */}
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {u.profile?.target_exams?.slice(0, 2).map((exam, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 text-[10px] font-medium truncate"
                              >
                                {exam}
                              </span>
                            ))}
                            {(u.profile?.target_exams?.length || 0) > 2 && (
                              <span className="text-[10px] text-charcoal-400 font-mono">
                                +{(u.profile?.target_exams?.length || 0) - 2}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 5. Coins & Streak */}
                        <td className="py-3 px-3">
                          <div className="space-y-0.5 text-[11px] font-mono">
                            <div className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                              <span>🪙 {u.profile?.coins_balance ?? 0}</span>
                              <span className="text-[9px] text-charcoal-400 font-sans">coins</span>
                            </div>
                            <div className="text-charcoal-500 dark:text-charcoal-400 flex items-center gap-1 text-[10px]">
                              <FlameIcon size={12} className="text-orange-500" />
                              <span>{u.profile?.current_streak ?? 0}d streak</span>
                            </div>
                          </div>
                        </td>

                        {/* 6. Subscription */}
                        <td className="py-3 px-3">
                          <div className="space-y-0.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                u.profile?.subscription_plan === 'ELITE'
                                  ? 'bg-institutional-100 dark:bg-institutional-950 text-institutional-700 dark:text-institutional-300'
                                  : u.profile?.subscription_plan === 'PRO'
                                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                                  : 'bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-400'
                              }`}
                            >
                              {u.profile?.subscription_plan !== 'FREE' && <CrownIcon size={10} />}
                              <span>{u.profile?.subscription_plan || 'FREE'}</span>
                            </span>
                            <div className="text-[9px] text-charcoal-400 font-mono">
                              {u.profile?.subscription_status || 'INACTIVE'}
                            </div>
                          </div>
                        </td>

                        {/* 7. Joined On */}
                        <td className="py-3 px-3 font-mono text-[11px] text-charcoal-400">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                        </td>

                        {/* 8. Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(u)}
                              className="p-1.5 rounded-lg border border-charcoal-200 dark:border-charcoal-700 hover:border-institutional-400 hover:bg-institutional-50 dark:hover:bg-institutional-950/40 text-charcoal-700 dark:text-charcoal-300 transition-colors cursor-pointer"
                              title="Edit user profile"
                            >
                              <EditIcon size={13} />
                            </button>

                            {!isSelf && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 rounded-lg border border-charcoal-200 dark:border-charcoal-700 hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                                title="Delete user"
                              >
                                <TrashIcon size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls (Strict 10 items per page) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 text-xs">
            <div className="text-charcoal-500 font-semibold">
              Showing{' '}
              <strong className="text-charcoal-900 dark:text-white font-mono">
                {totalUsers === 0 ? 0 : (currentPage - 1) * 10 + 1}
              </strong>{' '}
              to{' '}
              <strong className="text-charcoal-900 dark:text-white font-mono">
                {Math.min(currentPage * 10, totalUsers)}
              </strong>{' '}
              of <strong className="text-charcoal-900 dark:text-white font-mono">{totalUsers}</strong> candidates
              (10 per page)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage <= 1 || usersLoading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-2 rounded-xl border border-charcoal-300 dark:border-charcoal-700 text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 disabled:opacity-40 transition-all cursor-pointer"
                aria-label="Previous Page"
              >
                <ChevronLeftIcon size={14} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  onClick={() => setCurrentPage(pg)}
                  className={`w-8 h-8 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    currentPage === pg
                      ? 'bg-institutional-600 text-white shadow-xs font-extrabold'
                      : 'border border-charcoal-200 dark:border-charcoal-700 text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-100 dark:hover:bg-charcoal-800'
                  }`}
                >
                  {pg}
                </button>
              ))}

              <button
                disabled={currentPage >= totalPages || usersLoading}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-2 rounded-xl border border-charcoal-300 dark:border-charcoal-700 text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 disabled:opacity-40 transition-all cursor-pointer"
                aria-label="Next Page"
              >
                <ChevronRightIcon size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER PROFILE MODAL */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal-950/75 backdrop-blur-md animate-fade-in font-sans"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-scale-in relative overflow-hidden max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-charcoal-200 dark:border-charcoal-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-institutional-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <EditIcon size={16} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-charcoal-950 dark:text-white">
                    Edit Candidate Profile
                  </h3>
                  <p className="text-[11px] text-charcoal-400 font-mono">
                    ID: {selectedUser.id}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="p-1.5 rounded-full text-charcoal-400 hover:text-charcoal-700 dark:hover:text-charcoal-200 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 transition-colors cursor-pointer"
              >
                <XCircleIcon size={20} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveEdit} className="overflow-y-auto pr-1 space-y-4 text-xs font-semibold scrollbar-thin">
              {/* Full Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 text-left">
                  <label className="text-charcoal-700 dark:text-charcoal-300 font-bold">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-institutional-500"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-charcoal-700 dark:text-charcoal-300 font-bold">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-institutional-500"
                  />
                </div>
              </div>

              {/* Role & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 text-left">
                  <label className="text-charcoal-700 dark:text-charcoal-300 font-bold">
                    System Role ("Make Admin")
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    disabled={currentAdmin?.id === selectedUser.id}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-institutional-500 font-bold"
                  >
                    <option value="student">Student Aspirant</option>
                    <option value="admin">Administrator (Admin Studio Access)</option>
                  </select>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-charcoal-700 dark:text-charcoal-300 font-bold">Account Status</label>
                  <select
                    value={editForm.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.value === 'active' })}
                    disabled={currentAdmin?.id === selectedUser.id}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-institutional-500 font-bold"
                  >
                    <option value="active">Active (Access Allowed)</option>
                    <option value="inactive">Suspended (Access Disabled)</option>
                  </select>
                </div>
              </div>

              {/* Coins Balance & Phone Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 text-left">
                  <label className="text-charcoal-700 dark:text-charcoal-300 font-bold">Coins Balance</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.coins_balance}
                    onChange={(e) => setEditForm({ ...editForm, coins_balance: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-institutional-500 font-mono"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-charcoal-700 dark:text-charcoal-300 font-bold">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={editForm.phone_number}
                    onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-institutional-500"
                  />
                </div>
              </div>

              {/* Subscription Plan & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 text-left">
                  <label className="text-charcoal-700 dark:text-charcoal-300 font-bold">Subscription Plan</label>
                  <select
                    value={editForm.subscription_plan}
                    onChange={(e) => setEditForm({ ...editForm, subscription_plan: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-institutional-500"
                  >
                    <option value="FREE">FREE Tier</option>
                    <option value="PRO">PRO Pass</option>
                    <option value="ELITE">ELITE Pass</option>
                    <option value="NONE">NONE (Admin)</option>
                  </select>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-charcoal-700 dark:text-charcoal-300 font-bold">Subscription Status</label>
                  <select
                    value={editForm.subscription_status}
                    onChange={(e) => setEditForm({ ...editForm, subscription_status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-institutional-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="EXPIRED">EXPIRED</option>
                  </select>
                </div>
              </div>

              {/* Target Exam Focus Pills */}
              <div className="space-y-1.5 text-left">
                <label className="text-charcoal-700 dark:text-charcoal-300 font-bold">Target Exam Focus</label>
                <div className="flex flex-wrap gap-1.5">
                  {EXAM_OPTIONS.map((exam) => {
                    const isSelected = editForm.target_exams.includes(exam);
                    return (
                      <button
                        key={exam}
                        type="button"
                        onClick={() => toggleExamInEdit(exam)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-institutional-600 text-white shadow-xs'
                            : 'border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 hover:border-institutional-400'
                        }`}
                      >
                        {exam} {isSelected && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Force Password Reset by Admin (Optional) */}
              <div className="space-y-1 text-left p-3 rounded-xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800">
                <label className="text-charcoal-700 dark:text-charcoal-300 font-bold flex items-center gap-1.5">
                  <LockIcon size={12} className="text-institutional-600" />
                  <span>Assign New Password (Optional)</span>
                </label>
                <input
                  type="password"
                  placeholder="Leave blank to keep current password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-charcoal-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-institutional-500 text-xs"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-charcoal-200 dark:border-charcoal-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2.5 rounded-xl border border-charcoal-300 dark:border-charcoal-700 text-charcoal-700 dark:text-charcoal-300 text-xs font-bold hover:bg-charcoal-100 dark:hover:bg-charcoal-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingUser}
                  className="px-5 py-2.5 rounded-xl bg-institutional-600 hover:bg-institutional-700 text-white text-xs font-extrabold shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {savingUser ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <span>Save Profile Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: COURSES (create a course, tag generated tests to it, see who enrolled) */}
      {activeTab === 'courses' && !courseModal && (
        <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-6 shadow-card space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-charcoal-150 dark:border-charcoal-800">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-charcoal-950 dark:text-white flex items-center gap-2">
                <span>Course Management</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-institutional-100 dark:bg-institutional-950 text-institutional-700 dark:text-institutional-300 font-mono font-bold">
                  {coursesTab.tests.length}{coursesTab.hasMore ? '+' : ''} Courses
                </span>
              </h2>
              <p className="text-xs text-charcoal-500 dark:text-charcoal-400 mt-1 max-w-2xl leading-relaxed">
                Create a course, tag generated mock tests to it, and see who enrolled. Tests tagged to a course can only be started by enrolled students.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start gap-3 w-full sm:w-auto">
            <div className="w-full sm:w-72 space-y-1">
              <div className="relative">
                <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
                <input
                  type="text"
                  value={coursesTab.search}
                  onChange={(e) => coursesTab.setSearch(e.target.value)}
                  placeholder="Search courses by title or exam"
                  className={`${INPUT_CLS} pl-9`}
                />
              </div>
              {coursesTab.pending && (
                <p className="text-[11px] text-charcoal-400 font-medium">
                  Searching {SEARCH_DEBOUNCE_MS / 1000} second{SEARCH_DEBOUNCE_MS === 1000 ? '' : 's'} after you stop typing...
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={openCreateCourse}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-institutional-600 hover:bg-institutional-700 active:bg-institutional-800 text-white text-xs font-extrabold shadow-md transition-all cursor-pointer shrink-0"
            >
              <PlusIcon size={14} />
              <span>New Course</span>
            </button>
            </div>
          </div>

          <div
            onScroll={coursesTab.onScroll}
            className="max-h-[34rem] overflow-auto rounded-2xl border border-charcoal-200 dark:border-charcoal-800 scrollbar-thin"
          >
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="bg-charcoal-50 dark:bg-charcoal-800/80 border-b border-charcoal-200 dark:border-charcoal-800 text-charcoal-500 dark:text-charcoal-400 font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-3">Exam</th>
                  <th className="py-3 px-3">Price</th>
                  <th className="py-3 px-3">Tests</th>
                  <th className="py-3 px-3">Enrolled</th>
                  <th className="py-3 px-3">Created</th>
                  <th className="py-3 px-3">Updated</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-150 dark:divide-charcoal-800 font-semibold">
                {coursesTab.loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-charcoal-400">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-institutional-600 border-t-transparent rounded-full animate-spin" />
                        <span>{coursesTab.search.trim() ? 'Searching all courses...' : 'Loading courses...'}</span>
                      </div>
                    </td>
                  </tr>
                ) : coursesTab.tests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-charcoal-400">
                      {coursesTab.search.trim()
                        ? `No course matches "${coursesTab.search.trim()}".`
                        : 'No courses yet. Click "New Course" to create one and tag your generated mocks to it.'}
                    </td>
                  </tr>
                ) : (
                  coursesTab.tests.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => openEditCourse(c)}
                      className="hover:bg-institutional-50/60 dark:hover:bg-charcoal-800/50 transition-colors cursor-pointer"
                      title="Open course details"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="min-w-0">
                            <div className="font-extrabold text-charcoal-900 dark:text-white truncate max-w-[16rem]">{c.title}</div>
                            <div className="text-[11px] text-charcoal-400 font-mono truncate max-w-[16rem]">{c.id}</div>
                          </div>
                          <span
                            className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${courseStatus(c).cls}`}
                          >
                            {courseStatus(c).label}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-charcoal-700 dark:text-charcoal-300 whitespace-nowrap">{c.target_exam}</td>

                      <td className="py-3 px-3 whitespace-nowrap font-mono">
                        <span className="font-extrabold text-charcoal-900 dark:text-white">₹{c.discounted_price}</span>
                        {c.original_price > c.discounted_price && (
                          <span className="ml-1.5 text-[11px] text-charcoal-400 line-through">₹{c.original_price}</span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono text-charcoal-700 dark:text-charcoal-300">{c.total_quizzes}</td>

                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openEnrolledUsers(c); }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-extrabold hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors cursor-pointer"
                          title="See who enrolled"
                        >
                          <UserIcon size={12} />
                          <span className="font-mono">{c.enrolled_count}</span>
                        </button>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-charcoal-600 dark:text-charcoal-400">
                        <div>{formatDate(c.created_at)}</div>
                        <div className="text-[10px] text-charcoal-400 font-mono">
                          {c.created_by ? (c.created_by === currentAdmin?.id ? 'by You' : `by ${c.created_by.slice(0, 8)}`) : 'Built-in'}
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-charcoal-600 dark:text-charcoal-400">{formatDate(c.updated_at)}</td>

                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openEditCourse(c); }}
                            title="Open course details, change tests"
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-institutional-300 dark:border-institutional-800 bg-institutional-50 dark:bg-institutional-950/50 text-institutional-700 dark:text-institutional-300 hover:bg-institutional-100 dark:hover:bg-institutional-900 transition-colors cursor-pointer"
                          >
                            <EditIcon size={12} />
                            <span>Open</span>
                          </button>
                          {c.is_active && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleTogglePublish(c); }}
                              title={c.is_published === false ? 'Make this course visible to users' : 'Take this course back to draft'}
                              className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${PUBLISH_BTN(c)}`}
                            >
                              {c.is_published === false ? 'Publish' : 'Unpublish'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleToggleCourseActive(c); }}
                            className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                              c.is_active
                                ? 'border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                                : 'border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                            }`}
                          >
                            {c.is_active ? 'Archive' : 'Restore'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {!coursesTab.loading && coursesTab.tests.length > 0 && (
              <div className="py-3 text-center text-[11px] text-charcoal-400 font-medium border-t border-charcoal-150 dark:border-charcoal-800">
                {coursesTab.loadingMore
                  ? 'Loading more courses...'
                  : coursesTab.hasMore
                  ? 'Scroll for more'
                  : `${coursesTab.tests.length} course${coursesTab.tests.length === 1 ? '' : 's'} shown. That is all of them.`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* COURSE PAGE: create or open a course. Replaces the table while open (no pop-up). */}
      {activeTab === 'courses' && courseModal && (
        <form
          onSubmit={handleSaveCourse}
          className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-6 sm:p-8 shadow-card space-y-6 animate-fade-in text-xs font-semibold"
        >
          {/* Top bar: breadcrumb, title and status, actions */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-charcoal-150 dark:border-charcoal-800">
            <div className="min-w-0 space-y-2">
              <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold text-charcoal-500 dark:text-charcoal-400">
                <button
                  type="button"
                  onClick={() => setCourseModal(null)}
                  disabled={savingCourse}
                  className="hover:text-institutional-600 dark:hover:text-institutional-400 hover:underline transition-colors cursor-pointer"
                >
                  Courses
                </button>
                <ChevronRightIcon size={12} className="text-charcoal-300 dark:text-charcoal-600 shrink-0" />
                <span className="text-charcoal-900 dark:text-charcoal-100 truncate max-w-[24rem]" aria-current="page">
                  {courseModal.mode === 'create' ? 'New Course' : courseModal.course.title}
                </span>
              </nav>

              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-extrabold text-charcoal-950 dark:text-white flex items-center gap-2">
                  <span>{courseModal.mode === 'create' ? 'New Course' : 'Course Details'}</span>
                  {courseModal.mode === 'edit' && (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${courseStatus(courseModal.course).cls}`}
                    >
                      {courseStatus(courseModal.course).label}
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-charcoal-500 dark:text-charcoal-400 font-medium">
                  {courseModal.mode === 'edit'
                    ? `Course ID: ${courseModal.course.id}${courseDetailLoading ? '  •  loading the latest details...' : ''}`
                    : 'Starts as a draft. Press Publish after saving when it is ready for users.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {courseModal.mode === 'edit' && (
                <button
                  type="button"
                  onClick={() => openEnrolledUsers(courseModal.course)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-xl border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                >
                  <UserIcon size={13} />
                  <span>Enrolled users ({courseModal.course.enrolled_count})</span>
                </button>
              )}

              {courseModal.mode === 'edit' && courseModal.course.is_active && (
                <button
                  type="button"
                  onClick={() => handleTogglePublish(courseModal.course)}
                  className={`text-[11px] font-bold px-3 py-2 rounded-xl border transition-colors cursor-pointer ${PUBLISH_BTN(courseModal.course)}`}
                >
                  {courseModal.course.is_published === false ? 'Publish' : 'Unpublish'}
                </button>
              )}

              <button
                type="submit"
                disabled={savingCourse || courseDetailLoading}
                className="px-5 py-2 rounded-xl bg-institutional-600 hover:bg-institutional-700 active:bg-institutional-800 disabled:opacity-60 text-white font-extrabold shadow-md transition-all cursor-pointer"
              >
                {savingCourse ? 'Saving...' : courseDetailLoading ? 'Loading...' : courseModal.mode === 'create' ? 'Create Course' : 'Save Changes'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: details and pricing */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-charcoal-400">Details &amp; Pricing</h3>

              <div className="space-y-1 text-left">
                <label className="text-charcoal-700 dark:text-charcoal-300 font-bold">Course Title</label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={150}
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  placeholder="e.g. SSC CGL Tier-1 Test Series"
                  className={INPUT_CLS}
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-charcoal-700 dark:text-charcoal-300 font-bold">Details</label>
                <textarea
                  rows={5}
                  maxLength={4000}
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  placeholder="What the course covers and who it is for"
                  className={INPUT_CLS}
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-charcoal-700 dark:text-charcoal-300 font-bold">Target Exam</label>
                <select
                  value={courseForm.target_exam}
                  onChange={(e) => setCourseForm({ ...courseForm, target_exam: e.target.value })}
                  className={INPUT_CLS}
                >
                  {EXAM_OPTIONS.map((exam) => (
                    <option key={exam} value={exam}>{exam}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 text-left">
                  <label className="text-charcoal-700 dark:text-charcoal-300 font-bold">Original Price (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={courseForm.original_price}
                    onChange={(e) => setCourseForm({ ...courseForm, original_price: e.target.value })}
                    className={`${INPUT_CLS} font-mono`}
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-charcoal-700 dark:text-charcoal-300 font-bold">Selling Price (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={courseForm.discounted_price}
                    onChange={(e) => setCourseForm({ ...courseForm, discounted_price: e.target.value })}
                    className={`${INPUT_CLS} font-mono`}
                  />
                </div>
              </div>

              {courseModal.mode === 'edit' && (
                <div className="grid grid-cols-2 gap-3 text-[11px] text-charcoal-500 dark:text-charcoal-400 font-medium pt-1">
                  <div>
                    Created {formatDate(courseModal.course.created_at)}
                    <span className="font-mono text-charcoal-400">
                      {' '}
                      {courseModal.course.created_by
                        ? courseModal.course.created_by === currentAdmin?.id
                          ? 'by You'
                          : `by ${courseModal.course.created_by.slice(0, 8)}`
                        : '(built-in)'}
                    </span>
                  </div>
                  <div>Updated {formatDate(courseModal.course.updated_at)}</div>
                </div>
              )}
            </div>

            {/* Right: tag generated tests */}
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-charcoal-400">Tests in this Course</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-institutional-100 dark:bg-institutional-950 text-institutional-700 dark:text-institutional-300 font-mono font-bold">
                  {courseForm.test_ids.length} selected
                </span>
              </div>

              {courseModal.mode === 'edit' && !courseModal.course.created_by && (
                <div className="p-3 rounded-xl bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 text-charcoal-500 dark:text-charcoal-400 font-medium">
                  Built-in course: its own {(courseModal.course.quizzes || []).length - taggedQuizzes(courseModal.course).length} quizzes stay as they are.
                  Tests you tick below are added next to them.
                </div>
              )}

              <div className="relative">
                <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
                <input
                  type="text"
                  value={testSearch}
                  onChange={(e) => setTestSearch(e.target.value)}
                  placeholder="Search tests by title or subject"
                  className={`${INPUT_CLS} pl-9`}
                />
              </div>
              {testSearchPending && (
                <p className="text-[11px] text-charcoal-400 font-medium -mt-1.5">
                  Searching {SEARCH_DEBOUNCE_MS / 1000} second{SEARCH_DEBOUNCE_MS === 1000 ? '' : 's'} after you stop typing...
                </p>
              )}

              <div
                onScroll={handleTestListScroll}
                className="h-[22rem] overflow-y-auto rounded-xl border border-charcoal-200 dark:border-charcoal-700 divide-y divide-charcoal-150 dark:divide-charcoal-800 scrollbar-thin"
              >
                {testsLoading ? (
                  <div className="py-10 text-center text-charcoal-400 font-medium">
                    {testSearch.trim() ? 'Searching all tests...' : 'Loading tests...'}
                  </div>
                ) : pickerTests.length === 0 ? (
                  <div className="py-10 text-center text-charcoal-400 font-medium">
                    {testSearch.trim() ? `No test matches "${testSearch.trim()}".` : 'No generated tests yet. Assemble some in the AI Pipeline first.'}
                  </div>
                ) : (
                  pickerTests.map((t) => {
                    const checked = courseForm.test_ids.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                          checked ? 'bg-institutional-50 dark:bg-institutional-950/40' : 'hover:bg-charcoal-50 dark:hover:bg-charcoal-800/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCourseTest(t.id)}
                          className="w-4 h-4 accent-institutional-600 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-charcoal-900 dark:text-white truncate">{t.title}</div>
                          <div className="text-[11px] text-charcoal-400 font-medium">
                            {t.subject || 'All subjects'} • {t.total_questions} Qs • {t.duration_minutes} min
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}

                {!testsLoading && pickerTests.length > 0 && (
                  <div className="py-3 text-center text-[11px] text-charcoal-400 font-medium">
                    {testsLoadingMore
                      ? 'Loading more tests...'
                      : testsHasMore
                      ? 'Scroll for more'
                      : `${pickerTests.length} test${pickerTests.length === 1 ? '' : 's'} shown. That is all of them.`}
                  </div>
                )}
              </div>

              <p className="text-[11px] text-charcoal-400 font-medium">
                Tagged tests keep their questions; the course only links to them. Once the course is published, students must enroll to start them.
              </p>
            </div>
          </div>
        </form>
      )}

      {/* ENROLLED USERS MODAL */}
      {enrolledModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal-950/75 backdrop-blur-md animate-fade-in font-sans"
          onClick={() => setEnrolledModal(null)}
        >
          <div
            className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-scale-in relative overflow-hidden max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-charcoal-200 dark:border-charcoal-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <UserIcon size={16} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-charcoal-950 dark:text-white">Enrolled Users</h3>
                  <p className="text-[11px] text-charcoal-400 font-medium truncate max-w-md">{enrolledModal.course.title}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEnrolledModal(null)}
                className="p-1.5 rounded-full text-charcoal-400 hover:text-charcoal-700 dark:hover:text-charcoal-200 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 transition-colors cursor-pointer"
              >
                <XCircleIcon size={20} />
              </button>
            </div>

            <div className="overflow-auto rounded-2xl border border-charcoal-200 dark:border-charcoal-800 scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-charcoal-50 dark:bg-charcoal-800/80 border-b border-charcoal-200 dark:border-charcoal-800 text-charcoal-500 dark:text-charcoal-400 font-extrabold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-3">Enrolled On</th>
                    <th className="py-3 px-3">Amount Paid</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal-150 dark:divide-charcoal-800 font-semibold">
                  {enrolledModal.loading ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-charcoal-400">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-institutional-600 border-t-transparent rounded-full animate-spin" />
                          <span>Loading enrolled users...</span>
                        </div>
                      </td>
                    </tr>
                  ) : enrolledModal.users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-charcoal-400">No one has enrolled in this course yet.</td>
                    </tr>
                  ) : (
                    enrolledModal.users.map((u) => (
                      <tr key={u.user_id} className="hover:bg-charcoal-50/60 dark:hover:bg-charcoal-800/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-charcoal-900 dark:text-white">{u.full_name}</div>
                          <div className="text-[11px] text-charcoal-400 font-mono">{u.email}</div>
                        </td>
                        <td className="py-3 px-3 text-charcoal-600 dark:text-charcoal-400 whitespace-nowrap">{formatDate(u.enrolled_at)}</td>
                        <td className="py-3 px-3 font-mono text-charcoal-800 dark:text-charcoal-200">
                          {u.amount_paid != null ? `₹${u.amount_paid}` : '—'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                            {u.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MOCK TESTS (every available test, newest first; infinite scroll, server-side search) */}
      {activeTab === 'tests' && !testDetail && (
        <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-6 shadow-card space-y-5 animate-fade-in">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-charcoal-150 dark:border-charcoal-800">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-charcoal-950 dark:text-white flex items-center gap-2">
                <span>Mock Tests</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-institutional-100 dark:bg-institutional-950 text-institutional-700 dark:text-institutional-300 font-mono font-bold">
                  {stats?.total_configured_tests ?? testsTab.tests.length} Available
                </span>
              </h2>
              <p className="text-xs text-charcoal-500 dark:text-charcoal-400 mt-1">
                Every available test, newest first. Scroll for more; search looks through all of them.
              </p>
            </div>

            <div className="w-full lg:w-80 space-y-1">
              <div className="relative">
                <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
                <input
                  type="text"
                  value={testsTab.search}
                  onChange={(e) => testsTab.setSearch(e.target.value)}
                  placeholder="Search tests by title or subject"
                  className={`${INPUT_CLS} pl-9`}
                />
              </div>
              {testsTab.pending && (
                <p className="text-[11px] text-charcoal-400 font-medium">
                  Searching {SEARCH_DEBOUNCE_MS / 1000} second{SEARCH_DEBOUNCE_MS === 1000 ? '' : 's'} after you stop typing...
                </p>
              )}
            </div>
          </div>

          <div
            onScroll={testsTab.onScroll}
            className="max-h-[34rem] overflow-auto rounded-2xl border border-charcoal-200 dark:border-charcoal-800 scrollbar-thin"
          >
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="bg-charcoal-50 dark:bg-charcoal-800 border-b border-charcoal-200 dark:border-charcoal-800 text-charcoal-500 dark:text-charcoal-400 font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Test</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Subject</th>
                  <th className="py-3 px-3">Exam</th>
                  <th className="py-3 px-3">Questions</th>
                  <th className="py-3 px-3">Duration</th>
                  <th className="py-3 px-3">Marks</th>
                  <th className="py-3 px-3">Created</th>
                  <th className="py-3 px-4">In Courses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-150 dark:divide-charcoal-800 font-semibold">
                {testsTab.loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-charcoal-400">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-institutional-600 border-t-transparent rounded-full animate-spin" />
                        <span>{testsTab.search.trim() ? 'Searching all tests...' : 'Loading tests...'}</span>
                      </div>
                    </td>
                  </tr>
                ) : testsTab.tests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-charcoal-400">
                      {testsTab.search.trim()
                        ? `No test matches "${testsTab.search.trim()}".`
                        : 'No tests yet. Assemble some in the AI Pipeline.'}
                    </td>
                  </tr>
                ) : (
                  testsTab.tests.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => openTest(t)}
                      className="hover:bg-institutional-50/60 dark:hover:bg-charcoal-800/50 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-charcoal-900 dark:text-white truncate max-w-[18rem]">{t.title}</div>
                        <div className="text-[11px] text-charcoal-400 font-mono truncate max-w-[18rem]">{t.id}</div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-institutional-100 dark:bg-institutional-950/60 text-institutional-700 dark:text-institutional-300">
                          {t.test_type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-charcoal-700 dark:text-charcoal-300 whitespace-nowrap">{t.subject || 'All subjects'}</td>
                      <td className="py-3 px-3 text-charcoal-700 dark:text-charcoal-300 whitespace-nowrap">{t.target_exam}</td>
                      <td className="py-3 px-3 font-mono text-charcoal-800 dark:text-charcoal-200">{t.total_questions}</td>
                      <td className="py-3 px-3 font-mono text-charcoal-800 dark:text-charcoal-200 whitespace-nowrap">{t.duration_minutes} min</td>
                      <td className="py-3 px-3 font-mono whitespace-nowrap">
                        <span className="text-emerald-600 dark:text-emerald-400">+{t.positive_marks_per_q}</span>
                        <span className="text-charcoal-300 dark:text-charcoal-600"> / </span>
                        <span className="text-rose-600 dark:text-rose-400">-{t.negative_marks_per_q}</span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-charcoal-600 dark:text-charcoal-400">{formatDate(t.created_at)}</td>
                      <td className="py-3 px-4">
                        {testCourses[t.id] ? (
                          <div className="flex flex-wrap gap-1">
                            {testCourses[t.id].map((title) => (
                              <span
                                key={title}
                                className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 truncate max-w-[10rem]"
                                title={title}
                              >
                                {title}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-charcoal-300 dark:text-charcoal-600">Not in a course</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {!testsTab.loading && testsTab.tests.length > 0 && (
              <div className="py-3 text-center text-[11px] text-charcoal-400 font-medium border-t border-charcoal-150 dark:border-charcoal-800">
                {testsTab.loadingMore
                  ? 'Loading more tests...'
                  : testsTab.hasMore
                  ? 'Scroll for more'
                  : `${testsTab.tests.length} test${testsTab.tests.length === 1 ? '' : 's'} shown. That is all of them.`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MOCK TEST PAGE: edit, see the questions, delete */}
      {activeTab === 'tests' && testDetail && (
        <div className="space-y-5 animate-fade-in text-xs font-semibold">
          <form
            onSubmit={handleSaveTest}
            className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-6 sm:p-8 shadow-card space-y-6"
          >
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-charcoal-150 dark:border-charcoal-800">
              <div className="min-w-0 space-y-2">
                <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold text-charcoal-500 dark:text-charcoal-400">
                  <button
                    type="button"
                    onClick={closeTest}
                    disabled={savingTest || deletingTest}
                    className="hover:text-institutional-600 dark:hover:text-institutional-400 hover:underline transition-colors cursor-pointer"
                  >
                    Mock Tests
                  </button>
                  <ChevronRightIcon size={12} className="text-charcoal-300 dark:text-charcoal-600 shrink-0" />
                  <span className="text-charcoal-900 dark:text-charcoal-100 truncate max-w-[24rem]" aria-current="page">
                    {testDetail.test.title}
                  </span>
                </nav>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-charcoal-950 dark:text-white">Test Details</h2>
                  <p className="text-[11px] text-charcoal-500 dark:text-charcoal-400 font-medium">
                    Test ID: {testDetail.test.id}
                    {testDetail.loading ? '  •  loading the latest details...' : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={testDetail.loading || deletingTest}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  <TrashIcon size={13} />
                  <span>Delete test</span>
                </button>
                <button
                  type="submit"
                  disabled={savingTest || testDetail.loading}
                  className="px-5 py-2 rounded-xl bg-institutional-600 hover:bg-institutional-700 active:bg-institutional-800 disabled:opacity-60 text-white font-extrabold shadow-md transition-all cursor-pointer"
                >
                  {savingTest ? 'Saving...' : testDetail.loading ? 'Loading...' : 'Save Changes'}
                </button>
              </div>
            </div>

            {confirmDelete && (
              <div className="p-4 rounded-2xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 space-y-3">
                <div className="flex items-start gap-2 text-rose-700 dark:text-rose-300">
                  <AlertTriangleIcon size={16} className="shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-extrabold text-sm">Delete "{testDetail.test.title}"?</div>
                    <p className="font-medium">
                      {testDetail.test.courses?.length
                        ? `It will also be removed from: ${testDetail.test.courses.map((c) => c.title).join(', ')}. A course left with no tests goes back to draft.`
                        : 'It is not in any course.'}{' '}
                      Students' finished results are kept. This cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deletingTest}
                    className="px-4 py-2 rounded-xl border border-charcoal-300 dark:border-charcoal-700 text-charcoal-700 dark:text-charcoal-300 font-bold hover:bg-white dark:hover:bg-charcoal-800 transition-colors cursor-pointer"
                  >
                    Keep it
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteTest}
                    disabled={deletingTest}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-extrabold transition-colors cursor-pointer"
                  >
                    {deletingTest ? 'Deleting...' : 'Yes, delete'}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-charcoal-400">Edit</h3>
                <div className="space-y-1">
                  <label className="text-charcoal-700 dark:text-charcoal-300 font-bold">Title</label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={200}
                    value={testForm.title}
                    onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
                    className={INPUT_CLS}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-charcoal-700 dark:text-charcoal-300 font-bold">Description</label>
                  <textarea
                    rows={3}
                    maxLength={2000}
                    value={testForm.description}
                    onChange={(e) => setTestForm({ ...testForm, description: e.target.value })}
                    className={INPUT_CLS}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-charcoal-700 dark:text-charcoal-300 font-bold">Duration (min)</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={testForm.duration_minutes}
                      onChange={(e) => setTestForm({ ...testForm, duration_minutes: e.target.value })}
                      className={INPUT_CLS}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-charcoal-700 dark:text-charcoal-300 font-bold">Marks (+)</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={testForm.positive_marks_per_q}
                      onChange={(e) => setTestForm({ ...testForm, positive_marks_per_q: e.target.value })}
                      className={INPUT_CLS}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-charcoal-700 dark:text-charcoal-300 font-bold">Penalty (−)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={testForm.negative_marks_per_q}
                      onChange={(e) => setTestForm({ ...testForm, negative_marks_per_q: e.target.value })}
                      className={INPUT_CLS}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-charcoal-400 font-medium">
                  Courses that include this test are updated with the same title, duration and marks. Total marks are recalculated.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-charcoal-400">About</h3>
                <dl className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-charcoal-50 dark:bg-charcoal-800/60 border border-charcoal-200 dark:border-charcoal-800">
                  {[
                    ['Type', testDetail.test.test_type],
                    ['Exam', testDetail.test.target_exam],
                    ['Subject', testDetail.test.subject || 'All subjects'],
                    ['Questions', testDetail.test.total_questions],
                    ['Total marks', testDetail.test.total_marks],
                    ['Created', formatDate(testDetail.test.created_at)],
                    ['Updated', formatDate(testDetail.test.updated_at)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[10px] uppercase tracking-wider text-charcoal-400 font-extrabold">{label}</dt>
                      <dd className="text-charcoal-900 dark:text-charcoal-100 font-bold">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-charcoal-400 font-extrabold">In courses</div>
                  {testDetail.test.courses?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {testDetail.test.courses.map((c) => (
                        <span
                          key={c.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-institutional-50 dark:bg-institutional-950/50 text-institutional-700 dark:text-institutional-300 font-bold"
                        >
                          {c.title}
                          <span className="text-[9px] uppercase opacity-70">{c.is_published ? 'Published' : 'Draft'}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-charcoal-400">Not in a course</span>
                  )}
                </div>
              </div>
            </div>
          </form>

          <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-6 shadow-card space-y-4">
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-charcoal-400">
              Questions ({testDetail.loading ? '...' : testDetail.questions.length}) with correct answers
            </h3>
            <div className="max-h-[32rem] overflow-auto space-y-3 scrollbar-thin pr-1">
              {testDetail.loading ? (
                <div className="py-8 text-center text-charcoal-400">Loading questions...</div>
              ) : (
                testDetail.questions.map((q, i) => (
                  <div key={q.id} className="p-4 rounded-2xl border border-charcoal-200 dark:border-charcoal-800 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="font-mono text-charcoal-400">{i + 1}.</span>
                      <div className="text-charcoal-900 dark:text-charcoal-100 font-bold whitespace-pre-wrap">{q.question_text}</div>
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-5">
                      {q.options.map((o) => {
                        const right = o.id === q.correct_option;
                        return (
                          <li
                            key={o.id}
                            className={`px-2.5 py-1.5 rounded-lg border ${
                              right
                                ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                                : 'border-charcoal-200 dark:border-charcoal-800 text-charcoal-600 dark:text-charcoal-400'
                            }`}
                          >
                            <span className="font-mono uppercase mr-1.5">{o.id}.</span>
                            {o.text}
                          </li>
                        );
                      })}
                    </ul>
                    <div className="pl-5 flex flex-wrap gap-2 text-[10px] text-charcoal-400 uppercase font-extrabold">
                      {[q.difficulty, q.topic, q.subtopic].filter(Boolean).map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 rounded bg-charcoal-100 dark:bg-charcoal-800">{tag}</span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INFRASTRUCTURE & TELEMETRY */}
      {activeTab === 'health' && (
        <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-6 sm:p-8 shadow-card space-y-5 animate-fade-in">
          <div className="flex items-center gap-2 pb-3 border-b border-charcoal-150 dark:border-charcoal-800">
            <CpuIcon size={18} className="text-institutional-600" />
            <h2 className="text-base font-extrabold text-charcoal-950 dark:text-white">
              System Infrastructure & Live Health
            </h2>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-charcoal-900 dark:text-charcoal-100">MongoDB Database</div>
                <div className="text-[11px] text-charcoal-400">
                  Status: {health?.database?.status || 'Active'} (Mock: {health?.database?.is_mock ? 'In-Memory AsyncMongoMock' : 'Live Replica Set'})
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                Connected
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-charcoal-900 dark:text-charcoal-100">Redis In-Memory Cache</div>
                <div className="text-[11px] text-charcoal-400">
                  Status: {health?.cache?.status || 'Active'} (Fallback Memory: {health?.cache?.is_fallback ? 'Yes' : 'No'})
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                Operational
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-charcoal-900 dark:text-charcoal-100">Application Runtime</div>
                <div className="text-[11px] text-charcoal-400">
                  {health?.app || 'MockExam Platform API'} ({health?.environment || 'development'})
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-institutional-100 dark:bg-institutional-950 text-institutional-700 dark:text-institutional-300">
                v1.0.0
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
