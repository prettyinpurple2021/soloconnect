import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Feed } from './pages/Feed';
import { Profile } from './pages/Profile';
import { Groups } from './pages/Groups';
import { Events } from './pages/Events';
import { Notifications } from './pages/Notifications';
import { Messages } from './pages/Messages';
import { PersonalCalendar } from './pages/PersonalCalendar';
import { SuccessStories } from './pages/SuccessStories';
import { AcademyGroups } from './pages/AcademyGroups';
import { AgentMarketplace } from './pages/AgentMarketplace';
import { Challenges } from './pages/Challenges';
import { SoloScribe } from './pages/SoloScribe';
import { SoloSuccessAI } from './pages/SoloSuccessAI';
import { ContentFactory } from './pages/ContentFactory';
import { SoloSuccessAcademy } from './pages/SoloSuccessAcademy';
import { Toaster } from 'react-hot-toast';
import { SoloAssistant } from './components/SoloAssistant';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAuthReady } = useAuth();

  if (loading || !isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-center" />
          <SoloAssistant />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Feed />} />
              <Route path="profile/:userId" element={<Profile />} />
              <Route path="groups" element={<Groups />} />
              <Route path="events" element={<Events />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="messages" element={<Messages />} />
              <Route path="my-calendar" element={<PersonalCalendar />} />
              <Route path="success-stories" element={<SuccessStories />} />
              <Route path="academy-groups" element={<AcademyGroups />} />
              <Route path="agent-marketplace" element={<AgentMarketplace />} />
              <Route path="challenges" element={<Challenges />} />
              <Route path="soloscribe" element={<SoloScribe />} />
              <Route path="solosuccess-ai" element={<SoloSuccessAI />} />
              <Route path="content-factory" element={<ContentFactory />} />
              <Route path="academy" element={<SoloSuccessAcademy />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
