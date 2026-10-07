import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './theme/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { TestDiscoveryPage } from './pages/TestDiscoveryPage';
import { ExamRoomPage } from './pages/ExamRoomPage';
import { ResultScorecardPage } from './pages/ResultScorecardPage';
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import { AdminStudioPage } from './pages/AdminStudioPage';
import { SubscriptionPage } from './pages/SubscriptionPage';
import { CoursesPage } from './pages/CoursesPage';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { TypingMasterPage } from './pages/TypingMasterPage';
import { AiPipelinePage } from './pages/AiPipelinePage';
import { Footer } from './components/Footer';
import { api } from './services/api';

/**
 * AppContent — Architecturally Guided View Router & State Orchestrator
 *
 * Route Access Policies:
 * 1. Guest (Not Logged In):
 *    - Default Landing: 'discovery' (Public Mock Test Discovery & Platform Overview).
 *    - Starting a test or viewing personal stats prompts the AuthModal.
 * 2. Student (Logged In as Aspirant):
 *    - Default Landing: 'dashboard' (Student Performance & Lifetime Portfolio).
 *    - Permitted: 'dashboard', 'discovery', 'exam', 'results', 'subscription'.
 *    - Restricted: 'admin', 'pipeline' (Redirects to 'dashboard').
 * 3. Administrator (Logged In as Admin):
 *    - Default Landing: 'admin' (Admin Studio & Operations).
 *    - Permitted: 'admin', 'pipeline', 'discovery', 'exam', 'results', 'subscription'.
 */
// Each screen has its own address, so refresh, back/forward and shared links land on the right screen.
// (Admin Studio adds its own tab and test in the address: /admin/courses, /admin/tests/<id>.)
const VIEW_PATHS = {
  discovery: '/',
  dashboard: '/dashboard',
  courses: '/courses',
  subscription: '/subscription',
  typing: '/typing',
  admin: '/admin',
  pipeline: '/ai-pipeline',
  exam: '/exam',
  results: '/results',
};

const viewFromPath = (pathname) => {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/admin' || path.startsWith('/admin/')) return 'admin';
  if (path === '/dashboard' || path.startsWith('/dashboard/')) return 'dashboard'; // /dashboard/<tab>
  if (path.startsWith('/ai-pipeline/')) return 'pipeline'; // /ai-pipeline/<step>?subject=...
  if (path.startsWith('/courses/')) return 'courseDetail'; // /courses/<course id>
  return Object.keys(VIEW_PATHS).find((v) => VIEW_PATHS[v] === path) || null;
};

// The id embedded in a /courses/<id> address, or null when the path doesn't name one.
const courseIdFromPath = (pathname) => {
  const path = pathname.replace(/\/+$/, '') || '/';
  return path.startsWith('/courses/') ? decodeURIComponent(path.slice('/courses/'.length)) : null;
};

function AppContent() {
  const { user, isAdmin } = useAuth();

  // Dynamic default view based on initial auth state
  const [currentView, setCurrentView] = useState(() => {
    // An address that names a screen wins. The exam and results screens need a live attempt, so they cannot be opened by address.
    const fromUrl = viewFromPath(window.location.pathname);
    if (fromUrl && fromUrl !== 'exam' && fromUrl !== 'results' && window.location.pathname !== '/') return fromUrl;
    const cachedUser = localStorage.getItem('govexam_user');
    if (!cachedUser) return 'discovery';
    try {
      const parsed = JSON.parse(cachedUser);
      return parsed.role === 'admin' ? 'admin' : 'dashboard';
    } catch {
      return 'discovery';
    }
  });

  // Which course /courses/<id> names, so a refresh or shared link opens that course directly.
  const [openCourseId, setOpenCourseId] = useState(() => courseIdFromPath(window.location.pathname));
  // The exact address the course was opened from (whatever screen/tab that was), so "back" always
  // returns there precisely — not a fixed screen. null on a refresh/shared link (no origin to return to).
  const [courseDetailBackPath, setCourseDetailBackPath] = useState(null);

  const [activeAttempt, setActiveAttempt] = useState(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');
  const [lastCompletedAttemptId, setLastCompletedAttemptId] = useState(null);
  const [authModalState, setAuthModalState] = useState({ isOpen: false, initialTab: 'login' });

  const handleOpenAuthModal = (tab = 'login') => {
    setAuthModalState({ isOpen: true, initialTab: tab });
  };

  const handleCloseAuthModal = () => {
    setAuthModalState((prev) => ({ ...prev, isOpen: false }));
  };

  // Architectural Guard: Auto-route on login or logout
  useEffect(() => {
    if (!user) {
      // If user logs out, return to public discovery
      if (currentView === 'dashboard' || currentView === 'admin' || currentView === 'pipeline') {
        setCurrentView('discovery');
      }
    } else if (user.role === 'admin') {
      // If admin logs in from student screen
      if (currentView === 'dashboard') {
        setCurrentView('admin');
      }
    } else {
      // If student tries to view admin screens
      if (currentView === 'admin' || currentView === 'pipeline') {
        setCurrentView('dashboard');
      }
    }
  }, [user, currentView]);

  // Opens a course by id, address included: /courses/<id>. Wherever this was called from is
  // captured automatically (the address bar at that moment) as where "back" should return to —
  // a specific tab of the dashboard, the course list, or anywhere else, with no fixed list of cases.
  const handleOpenCourse = (courseId) => {
    setCourseDetailBackPath(window.location.pathname);
    setOpenCourseId(courseId);
    setCurrentView('courseDetail');
  };

  // Returns from the course detail page to exactly where it was opened from.
  const handleBackFromCourse = () => {
    const target = courseDetailBackPath || '/courses';
    window.history.pushState(null, '', target);
    setCurrentView(viewFromPath(target) || 'courses');
  };

  // The course detail page's breadcrumb label, named after whichever screen will reopen on "back".
  const courseDetailBackLabel = (() => {
    const v = viewFromPath(courseDetailBackPath || '/courses');
    if (v === 'dashboard') return 'Dashboard';
    if (v === 'courses') return 'Courses';
    return 'Back';
  })();

  // Keep the address bar in step with the screen, and the screen in step with back/forward.
  // A screen that manages its own sub-address (Admin Studio's tabs, the Dashboard's tabs) is left
  // alone as long as the address already resolves back to that same screen.
  useEffect(() => {
    if (currentView === 'courseDetail') {
      const want = `/courses/${encodeURIComponent(openCourseId || '')}`;
      if (window.location.pathname !== want) window.history.pushState(null, '', want);
      return;
    }
    if (viewFromPath(window.location.pathname) === currentView) return;
    window.history.pushState(null, '', VIEW_PATHS[currentView] || '/');
  }, [currentView, openCourseId]);

  useEffect(() => {
    const onPop = () => {
      const v = viewFromPath(window.location.pathname);
      if (v === 'courseDetail') {
        setOpenCourseId(courseIdFromPath(window.location.pathname));
        setCurrentView('courseDetail');
        return;
      }
      // Going back into an exam or results screen that no longer exists falls back to the home screen.
      if (v && v !== 'exam' && v !== 'results') setCurrentView(v);
      else if (v === 'exam' || v === 'results') setCurrentView(user ? (isAdmin ? 'admin' : 'dashboard') : 'discovery');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [user, isAdmin]);

  const [pendingTestToStart, setPendingTestToStart] = useState(null);

  // Resume starting test if candidate logged in after clicking start
  useEffect(() => {
    if (user && pendingTestToStart) {
      const target = pendingTestToStart;
      setPendingTestToStart(null);
      handleStartTest(target);
    }
  }, [user, pendingTestToStart]);

  // Start / Resume Mock Exam
  const handleStartTest = async (input) => {
    if (!user) {
      setPendingTestToStart(input);
      handleOpenAuthModal('login');
      return;
    }
    if (starting) return;
    setStartError('');

    // Callers pass either a test/attempt object or just a test id string.
    const testOrAttempt = typeof input === 'string' ? { id: input } : input;
    if (!testOrAttempt || !(testOrAttempt.attempt_id || testOrAttempt.id || testOrAttempt.test_id)) {
      setStartError('This test has no id, so it cannot be started.');
      return;
    }

    // Resuming a session that already exists (e.g. "Resume Session Now"): go straight in.
    if (testOrAttempt.attempt_id) {
      setActiveAttempt({
        attempt_id: testOrAttempt.attempt_id,
        test_id: testOrAttempt.test_id || testOrAttempt.id,
        test_title: testOrAttempt.test_title || testOrAttempt.title,
        duration_minutes: testOrAttempt.duration_minutes || 60,
      });
      setCurrentView('exam');
      return;
    }

    // New start: ask the backend to create the attempt (server-side timer + question set).
    setStarting(true);
    try {
      const session = await api.tests.start(testOrAttempt.id || testOrAttempt.test_id);
      setActiveAttempt({
        attempt_id: session.attempt_id,
        test_id: session.test_id,
        test_title: session.test_title,
        duration_minutes: session.duration_minutes,
      });
      setCurrentView('exam');
    } catch (err) {
      setStartError(err.message || 'Could not start this test.');
    } finally {
      setStarting(false);
    }
  };

  // Test completed -> Route to Result Scorecard
  const handleTestCompleted = (result) => {
    setActiveAttempt(null);
    setLastCompletedAttemptId(result.attempt_id || 'demo-attempt');
    setCurrentView('results');
  };

  return (
    <div className="min-h-screen bg-charcoal-50 dark:bg-charcoal-950 text-charcoal-900 dark:text-charcoal-100 flex flex-col font-sans transition-colors duration-200">
      {/* Start-test failure (shown instead of silently opening a demo exam) */}
      {startError && (
        <div className="fixed top-24 inset-x-0 z-50 flex justify-center px-4" role="alert">
          <div className="max-w-lg w-full flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-lg">
            <span className="flex-1">
              <strong className="block">Could not start the test</strong>
              {startError}
            </span>
            <button type="button" className="font-bold" onClick={() => setStartError('')} aria-label="Dismiss">✕</button>
          </div>
        </div>
      )}

      {/* Floating Pill Navbar (Rendered on all pages EXCEPT fullscreen exam room) */}
      {currentView !== 'exam' && (
        <Navbar
          currentView={currentView}
          setCurrentView={setCurrentView}
          activeAttempt={activeAttempt}
          onOpenAuthModal={handleOpenAuthModal}
        />
      )}

      {/* Main Content Area (With top padding pt-20 to accommodate floating navbar) */}
      <div className={`flex-1 ${currentView !== 'exam' ? 'pt-20 sm:pt-24 pb-12' : ''}`}>
        {/* 1. Public Test Discovery / Landing Page */}
        {currentView === 'discovery' && (
          <TestDiscoveryPage
            onStartTest={handleStartTest}
            activeAttempt={activeAttempt}
            onOpenAuthModal={handleOpenAuthModal}
            onNavigate={setCurrentView}
            onOpenCourse={handleOpenCourse}
          />
        )}

        {/* 2. Live Distraction-Free Exam Room */}
        {currentView === 'exam' && (
          <ExamRoomPage
            attemptSession={activeAttempt}
            onTestCompleted={handleTestCompleted}
            onExit={() => setCurrentView(user ? (isAdmin ? 'admin' : 'dashboard') : 'discovery')}
          />
        )}

        {/* 3. Result Scorecard & Analytics Dashboard */}
        {currentView === 'results' && (
          <ResultScorecardPage
            attemptId={lastCompletedAttemptId || 'demo-attempt'}
            onRetake={() => setCurrentView('discovery')}
            onGoToDashboard={() => setCurrentView(user?.role === 'admin' ? 'admin' : 'dashboard')}
            onBackToDiscovery={() => setCurrentView('discovery')}
          />
        )}

        {/* 4. Student Dashboard (Only accessible to authenticated students) */}
        {currentView === 'dashboard' && (
          <StudentDashboardPage
            onSelectAttempt={(attemptId) => {
              setLastCompletedAttemptId(attemptId);
              setCurrentView('results');
            }}
            onStartTest={handleStartTest}
            onNavigate={setCurrentView}
            onOpenCourse={handleOpenCourse}
          />
        )}

        {/* 5. Exam-Oriented Courses & Quizzes Page */}
        {(currentView === 'courses' || currentView === 'subscription') && (
          <CoursesPage
            onNavigateToDashboard={() => setCurrentView('dashboard')}
            onNavigateToQuiz={() => setCurrentView('discovery')}
            onStartTest={handleStartTest}
            onOpenCourse={handleOpenCourse}
          />
        )}

        {/* 5b. One course's full detail page: every quiz and mock test it includes */}
        {currentView === 'courseDetail' && (
          <CourseDetailPage
            courseId={openCourseId}
            backLabel={courseDetailBackLabel}
            onBackToCourses={handleBackFromCourse}
            onStartTest={handleStartTest}
          />
        )}

        {/* 6. Typing Master Mock Engine */}
        {currentView === 'typing' && (
          <TypingMasterPage />
        )}

        {/* 7. Admin Studio Page (Admin only) */}
        {currentView === 'admin' && (
          <AdminStudioPage />
        )}

        {/* 8. AI Question Pipeline (Admin only) */}
        {currentView === 'pipeline' && (
          <AiPipelinePage onGoToMocks={() => setCurrentView('discovery')} />
        )}
      </div>

      {/* Institutional Global Footer (Rendered on all pages EXCEPT fullscreen exam room) */}
      {currentView !== 'exam' && (
        <Footer onNavigate={setCurrentView} />
      )}

      {/* Authentication Modal (Sign In / Register / 1-Click Demo) */}
      <AuthModal
        isOpen={authModalState.isOpen}
        initialTab={authModalState.initialTab}
        onClose={handleCloseAuthModal}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
