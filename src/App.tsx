import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Toaster } from 'react-hot-toast';
import { SoloAssistant } from './components/SoloAssistant';

// Lazy load pages for production performance
import { Feed } from './pages/Feed';
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Groups = lazy(() => import('./pages/Groups').then(m => ({ default: m.Groups })));
const GroupDetail = lazy(() => import('./pages/GroupDetail').then(m => ({ default: m.GroupDetail })));
const Events = lazy(() => import('./pages/Events').then(m => ({ default: m.Events })));
const Notifications = lazy(() => import('./pages/Notifications').then(m => ({ default: m.Notifications })));
const Messages = lazy(() => import('./pages/Messages').then(m => ({ default: m.Messages })));
const Connections = lazy(() => import('./pages/Connections').then(m => ({ default: m.Connections })));
const PersonalCalendar = lazy(() => import('./pages/PersonalCalendar').then(m => ({ default: m.PersonalCalendar })));
const Search = lazy(() => import('./pages/Search').then(m => ({ default: m.Search })));
const FounderMatch = lazy(() => import('./pages/FounderMatch').then(m => ({ default: m.FounderMatch })));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const Terms = lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })));
const Privacy = lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-16 h-16 border-8 border-on-surface border-t-primary rounded-none animate-spin shadow-kinetic-sm"></div>
  </div>
);

const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAuthReady } = useAuth();

  if (loading || !isAuthReady) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function AppContent() {
  const { user, isAuthReady } = useAuth();

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={!user && isAuthReady ? <Landing /> : (user ? <Navigate to="/feed" replace /> : <LoadingScreen />)} />
        <Route path="/login" element={user ? <Navigate to="/feed" replace /> : <Login />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route
          path="/feed"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Feed />} />
          <Route path="profile/:userId" element={<Profile />} />
          <Route path="groups" element={<Groups />} />
          <Route path="groups/:groupId" element={<GroupDetail />} />
          <Route path="events" element={<Events />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="messages" element={<Messages />} />
          <Route path="connections" element={<Connections />} />
          <Route path="my-calendar" element={<PersonalCalendar />} />
          <Route path="search" element={<Search />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="founder-match" element={<FounderMatch />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-center" />
          <SoloAssistant />
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
