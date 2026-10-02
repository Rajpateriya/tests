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
import { AiPipelinePage } from './pages/AiPipelinePage';

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
function AppContent() {
  const { user, isAdmin } = useAuth();

  // Dynamic default view based on initial auth state
  const [currentView, setCurrentView] = useState(() => {
    const cachedUser = localStorage.getItem('govexam_user');
    if (!cachedUser) return 'discovery';
    try {
      const parsed = JSON.parse(cachedUser);
      return parsed.role === 'admin' ? 'admin' : 'dashboard';
    } catch {
      return 'discovery';
    }
  });

  const [activeAttempt, setActiveAttempt] = useState(null);
  const [lastCompletedAttemptId, setLastCompletedAttemptId] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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
  }, [user]);

  // Start / Resume Mock Exam
  const handleStartTest = (testOrAttempt) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    const attemptData = {
      attempt_id: testOrAttempt.attempt_id || `attempt-${Date.now()}`,
      test_id: testOrAttempt.id || testOrAttempt.test_id,
      test_title: testOrAttempt.title || testOrAttempt.test_title,
      duration_minutes: testOrAttempt.duration_minutes || 60,
    };
    setActiveAttempt(attemptData);
    setCurrentView('exam');
  };

  // Test completed -> Route to Result Scorecard
  const handleTestCompleted = (result) => {
    setActiveAttempt(null);
    setLastCompletedAttemptId(result.attempt_id || 'demo-attempt');
    setCurrentView('results');
  };

  return (
    <div className="min-h-screen bg-charcoal-50 dark:bg-charcoal-950 text-charcoal-900 dark:text-charcoal-100 flex flex-col font-sans transition-colors duration-200">
      {/* Floating Pill Navbar (Rendered on all pages EXCEPT fullscreen exam room) */}
      {currentView !== 'exam' && (
        <Navbar
          currentView={currentView}
          setCurrentView={setCurrentView}
          activeAttempt={activeAttempt}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
        />
      )}

      {/* Main Content Area (With top padding pt-20 to accommodate floating navbar) */}
      <div className={`flex-1 ${currentView !== 'exam' ? 'pt-20 sm:pt-24 pb-12' : ''}`}>
        {/* 1. Public Test Discovery / Landing Page */}
        {currentView === 'discovery' && (
          <TestDiscoveryPage
            onStartTest={handleStartTest}
            activeAttempt={activeAttempt}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
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
          />
        )}

        {/* 5. Subscription & Passes Page */}
        {currentView === 'subscription' && (
          <SubscriptionPage onGoToMocks={() => setCurrentView('discovery')} />
        )}

        {/* 6. Admin Studio Page (Admin only) */}
        {currentView === 'admin' && (
          <AdminStudioPage onTestCreated={() => setCurrentView('discovery')} />
        )}

        {/* 7. AI Question Pipeline (Admin only) */}
        {currentView === 'pipeline' && (
          <AiPipelinePage onGoToMocks={() => setCurrentView('discovery')} />
        )}
      </div>

      {/* Authentication Modal (Sign In / Register / 1-Click Demo) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
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
