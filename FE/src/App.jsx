import React, { useState } from 'react';
import { ThemeProvider } from './theme/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { TestDiscoveryPage } from './pages/TestDiscoveryPage';
import { ExamRoomPage } from './pages/ExamRoomPage';
import { ResultScorecardPage } from './pages/ResultScorecardPage';
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import { AdminStudioPage } from './pages/AdminStudioPage';
import { SubscriptionPage } from './pages/SubscriptionPage';

function AppContent() {
  const [currentView, setCurrentView] = useState('discovery'); // discovery | exam | results | dashboard | admin | subscription

  const [activeAttempt, setActiveAttempt] = useState(null);
  const [lastCompletedAttemptId, setLastCompletedAttemptId] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Start / Resume Mock Exam
  const handleStartTest = (testOrAttempt) => {
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
    <div className="app-container">
      {/* Show Navbar on all pages EXCEPT during live fullscreen exam room */}
      {currentView !== 'exam' && (
        <Navbar
          currentView={currentView}
          setCurrentView={setCurrentView}
          activeAttempt={activeAttempt}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
        />
      )}

      {/* Main View Router */}
      {currentView === 'discovery' && (
        <TestDiscoveryPage
          onStartTest={handleStartTest}
          activeAttempt={activeAttempt}
        />
      )}

      {currentView === 'exam' && (
        <ExamRoomPage
          attemptSession={activeAttempt}
          onTestCompleted={handleTestCompleted}
          onExit={() => setCurrentView('discovery')}
        />
      )}

      {currentView === 'results' && (
        <ResultScorecardPage
          attemptId={lastCompletedAttemptId || 'demo-attempt'}
          onRetake={() => setCurrentView('discovery')}
          onGoToDashboard={() => setCurrentView('dashboard')}
          onBackToDiscovery={() => setCurrentView('discovery')}
        />
      )}

      {currentView === 'dashboard' && (
        <StudentDashboardPage
          onSelectAttempt={(attemptId) => {
            setLastCompletedAttemptId(attemptId);
            setCurrentView('results');
          }}
          onStartTest={handleStartTest}
        />
      )}

      {currentView === 'subscription' && (
        <SubscriptionPage
          onGoToMocks={() => setCurrentView('discovery')}
        />
      )}

      {currentView === 'admin' && (
        <AdminStudioPage
          onTestCreated={(newTest) => {
            setCurrentView('discovery');
          }}
        />
      )}


      {/* Auth Modal */}
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
