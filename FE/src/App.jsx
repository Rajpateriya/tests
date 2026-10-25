import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router';
import { ThemeProvider } from './theme/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { TestRulesModal } from './components/TestRulesModal';
import { TestDiscoveryPage } from './pages/TestDiscoveryPage';
import { ExamRoomPage } from './pages/ExamRoomPage';
import { ResultScorecardPage } from './pages/ResultScorecardPage';
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import { AdminStudioPage } from './pages/AdminStudioPage';
import { CoursesPage } from './pages/CoursesPage';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { TypingMasterPage } from './pages/TypingMasterPage';
import { AiPipelinePage } from './pages/AiPipelinePage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { AboutUsPage } from './pages/AboutUsPage';
import { Footer } from './components/Footer';
import { CartPage } from './pages/CartPage';
import { api } from './services/api';
import { ROUTES, DASHBOARD_TABS, homePathFor } from './routes';

/**
 * Route access policies:
 * 1. Guest: the landing page ('/'), courses, typing. Starting a test prompts the AuthModal.
 *    Dashboard / admin / pipeline addresses redirect to '/'.
 * 2. Student: dashboard, plus everything public. Admin addresses redirect to the dashboard.
 * 3. Administrator: Admin Studio and the AI pipeline, plus everything public.
 *    The student dashboard address redirects to Admin Studio.
 * The exam and results screens need a live attempt, so opening them by address redirects home.
 * (The dashboard, Admin Studio and the AI pipeline keep their own tab/step in the address.)
 */

// Signed-out visitors go to the landing page; a student on an admin screen (or an admin on the
// student dashboard) is sent to their own area.
const RequireRole = ({ role, children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to={ROUTES.home} replace />;
  const isAdmin = ['admin', 'super_admin'].includes(user.role);
  if (role === 'admin' && !isAdmin) return <Navigate to={ROUTES.dashboard} replace />;
  if ((role === 'student' || role === 'user') && isAdmin) return <Navigate to={ROUTES.admin} replace />;
  return children;
};

// /dashboard/<tab>: an unknown tab falls back to the default one.
const DashboardTab = (props) => {
  const { tab } = useParams();
  if (!DASHBOARD_TABS.includes(tab)) return <Navigate to={`${ROUTES.dashboard}/${DASHBOARD_TABS[0]}`} replace />;
  return <StudentDashboardPage {...props} />;
};

// /courses/<id>: "back" returns to the exact address the course was opened from (see useOpenCourse).
const CourseDetailRoute = ({ onStartTest }) => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const from = state?.from || ROUTES.courses;
  const backLabel = from.startsWith(ROUTES.dashboard) ? 'Dashboard' : from.startsWith(ROUTES.courses) ? 'Courses' : 'Back';

  return (
    <CourseDetailPage
      courseId={courseId}
      backLabel={backLabel}
      onBackToCourses={() => navigate(from)}
      onStartTest={onStartTest}
    />
  );
};

function AppContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isExam = pathname === ROUTES.exam;

  const [activeAttempt, setActiveAttempt] = useState(null);
  const [justFinishedExam, setJustFinishedExam] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');
  const [lastCompletedAttemptId, setLastCompletedAttemptId] = useState(null);
  const [authModalState, setAuthModalState] = useState({ isOpen: false, initialTab: 'login' });

  // Scroll to top on route change when there is no hash
  useEffect(() => {
    if (!window.location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [pathname]);

  const handleOpenAuthModal = (tab = 'login') => {
    setAuthModalState({ isOpen: true, initialTab: tab });
  };

  const handleCloseAuthModal = () => {
    setAuthModalState((prev) => ({ ...prev, isOpen: false }));
  };

  // The "just finished" flag only bridges the moment between clearing the attempt and arriving on
  // the results screen; once we have left the exam address it has done its job.
  useEffect(() => {
    if (pathname !== ROUTES.exam) setJustFinishedExam(false);
  }, [pathname]);

  const [pendingTestToStart, setPendingTestToStart] = useState(null);

  // Resume starting test if candidate logged in after clicking start
  useEffect(() => {
    if (user && pendingTestToStart) {
      const target = pendingTestToStart;
      setPendingTestToStart(null);
      handleStartTest(target);
    }
  }, [user, pendingTestToStart]);

  const [rulesModalTest, setRulesModalTest] = useState(null);

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
      navigate(ROUTES.exam);
      return;
    }

    // New start: Present Pre-Exam Instructions & Candidate Declaration page before starting
    let resolvedTest = testOrAttempt;
    const testId = testOrAttempt.id || testOrAttempt.test_id;
    if ((!resolvedTest.title || !resolvedTest.duration_minutes) && testId) {
      try {
        const details = await api.tests.getDetails(testId);
        if (details) resolvedTest = { ...details, ...resolvedTest };
      } catch (err) {
        console.warn('Could not fetch test details for rules modal:', err);
      }
    }
    setRulesModalTest(resolvedTest);
  };

  // Candidate finished reading instructions and accepted declaration ("I am ready to begin")
  const handleExecuteStartExam = async (test) => {
    setRulesModalTest(null);
    if (starting) return;
    setStartError('');
    setStarting(true);
    try {
      const session = await api.tests.start(test.id || test.test_id);
      setActiveAttempt({
        attempt_id: session.attempt_id,
        test_id: session.test_id,
        test_title: session.test_title || test.title,
        duration_minutes: session.duration_minutes || test.duration_minutes,
      });
      navigate(ROUTES.exam);
    } catch (err) {
      setStartError(err.message || 'Could not start this test.');
    } finally {
      setStarting(false);
    }
  };

  // Test completed -> Route to Result Scorecard
  const handleTestCompleted = (result) => {
    setJustFinishedExam(true);
    setActiveAttempt(null);
    setLastCompletedAttemptId(result.attempt_id || 'demo-attempt');
    navigate(ROUTES.results);
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-charcoal-50 dark:bg-charcoal-950 text-charcoal-900 dark:text-charcoal-100 flex flex-col font-sans transition-colors duration-200 relative">
      {/* Global Sleek Ambient Background & Soft Engineering Grid (Consistent Across All Pages) */}
      {!isExam && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none" aria-hidden="true">
          {/* Top Radiant Institutional Glow */}
          <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[920px] h-[520px] bg-gradient-to-b from-institutional-500/12 via-indigo-500/8 to-transparent dark:from-institutional-600/22 dark:via-indigo-600/14 dark:to-transparent blur-[140px] rounded-full" />
          
          {/* Atmospheric Color Diffusion Orbs */}
          <div className="absolute top-[22%] -left-36 w-[600px] h-[600px] bg-sky-500/5 dark:bg-sky-500/9 blur-[150px] rounded-full" />
          <div className="absolute top-[52%] -right-36 w-[650px] h-[650px] bg-purple-500/5 dark:bg-purple-600/9 blur-[160px] rounded-full" />
          <div className="absolute top-[82%] left-[12%] w-[520px] h-[520px] bg-emerald-500/5 dark:bg-emerald-500/8 blur-[140px] rounded-full" />

          {/* Delicate Technical Micro-Dot Grid with Smooth Radial Vignette Mask */}
          <div className="absolute inset-0 bg-subtle-mesh opacity-75 dark:opacity-45" />
        </div>
      )}

      {/* Start-test failure (shown instead of silently opening a demo exam) */}
      {startError && (
        <div className="fixed top-24 inset-x-0 z-50 flex justify-center px-4" role="alert">
          <div className="max-w-lg w-full flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-lg">
            <span className="flex-1">
              <strong className="block">Could not start the test</strong>
              {startError}
            </span>
            <button type="button" className="font-bold cursor-pointer" onClick={() => setStartError('')} aria-label="Dismiss">✕</button>
          </div>
        </div>
      )}

      {/* Floating Pill Navbar (Rendered on all pages EXCEPT fullscreen exam room) */}
      {!isExam && <Navbar activeAttempt={activeAttempt} onOpenAuthModal={handleOpenAuthModal} />}

      {/* Main Content Area (With top padding pt-20 to accommodate floating navbar) */}
      <div className={`flex-1 w-full min-w-0 relative z-10 ${!isExam ? 'pt-20 sm:pt-24 pb-12' : ''}`}>
        <Routes>
          {/* Public Test Discovery / Landing Page */}
          <Route
            path={ROUTES.home}
            element={
              <TestDiscoveryPage
                onStartTest={handleStartTest}
                activeAttempt={activeAttempt}
                onOpenAuthModal={handleOpenAuthModal}
              />
            }
          />

          {/* Live Distraction-Free Exam Room (needs a live attempt) */}
          <Route
            path={ROUTES.exam}
            element={
              activeAttempt ? (
                <ExamRoomPage
                  attemptSession={activeAttempt}
                  onTestCompleted={handleTestCompleted}
                  onExit={() => navigate(homePathFor(user))}
                />
              ) : justFinishedExam ? null : (
                <Navigate to={homePathFor(user)} replace />
              )
            }
          />

          {/* Result Scorecard & Analytics Dashboard (needs a finished attempt) */}
          <Route
            path={ROUTES.results}
            element={
              lastCompletedAttemptId ? (
                <ResultScorecardPage
                  attemptId={lastCompletedAttemptId}
                  onRetake={() => navigate(ROUTES.home)}
                  onGoToDashboard={() => navigate(homePathFor(user))}
                  onBackToDiscovery={() => navigate(ROUTES.home)}
                />
              ) : (
                <Navigate to={homePathFor(user)} replace />
              )
            }
          />

          {/* Student Dashboard: /dashboard -> /dashboard/<default tab> */}
          <Route path={ROUTES.dashboard} element={<Navigate to={`${ROUTES.dashboard}/${DASHBOARD_TABS[0]}`} replace />} />
          <Route
            path={`${ROUTES.dashboard}/:tab`}
            element={
              <RequireRole role="user">
                <DashboardTab
                  onSelectAttempt={(attemptId) => {
                    setLastCompletedAttemptId(attemptId);
                    navigate(ROUTES.results);
                  }}
                  onStartTest={handleStartTest}
                />
              </RequireRole>
            }
          />

          {/* Exam-Oriented Courses & Quizzes (the /subscription address shows the same page) */}
          <Route path={ROUTES.courses} element={<CoursesPage onStartTest={handleStartTest} />} />
          <Route path={ROUTES.subscription} element={<CoursesPage onStartTest={handleStartTest} />} />

          {/* One course's full detail page: every quiz and mock test it includes */}
          <Route path={`${ROUTES.courses}/:courseId`} element={<CourseDetailRoute onStartTest={handleStartTest} />} />

          {/* Typing Master Mock Engine */}
          <Route path={ROUTES.typing} element={<TypingMasterPage />} />

          {/* Admin Studio (admin only; it keeps its own tab / open test / open course in the address) */}
          <Route
            path={`${ROUTES.admin}/*`}
            element={
              <RequireRole role="admin">
                <AdminStudioPage />
              </RequireRole>
            }
          />

          {/* AI Question Pipeline (admin only; it keeps its own step and subject in the address) */}
          <Route
            path={`${ROUTES.pipeline}/*`}
            element={
              <RequireRole role="admin">
                <AiPipelinePage />
              </RequireRole>
            }
          />

          {/* Institutional Legal & Company Pages */}
          <Route path={ROUTES.terms} element={<TermsPage />} />
          <Route path="/terms-of-use" element={<TermsPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path={ROUTES.privacy} element={<PrivacyPolicyPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path={ROUTES.about} element={<AboutUsPage />} />
          <Route path="/about" element={<AboutUsPage />} />
          <Route path={ROUTES.refund} element={<TermsPage />} />

          {/* Multi-Course Cart */}
          <Route
            path={ROUTES.cart}
            element={<CartPage />}
          />

          {/* Anything else goes home */}
          <Route path="*" element={<Navigate to={homePathFor(user)} replace />} />
        </Routes>
      </div>

      {/* Institutional Global Footer (Rendered on all pages EXCEPT fullscreen exam room) */}
      {!isExam && <Footer />}

      {/* Authentication Modal (Sign In / Register / 1-Click Demo) */}
      <AuthModal
        isOpen={authModalState.isOpen}
        initialTab={authModalState.initialTab}
        onClose={handleCloseAuthModal}
      />

      {/* Official Pre-Exam Instructions & Candidate Declaration Page Modal */}
      <TestRulesModal
        test={rulesModalTest}
        isOpen={!!rulesModalTest}
        onClose={() => setRulesModalTest(null)}
        onStartExam={handleExecuteStartExam}
        onOpenAuthModal={handleOpenAuthModal}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
