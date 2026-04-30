import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

const ChatPage = lazy(() => import('./pages/ChatPage'));
const JobsPage = lazy(() => import('./pages/JobsPage'));
const PipelinesPage = lazy(() => import('./pages/PipelinesPage'));
const ClustersPage = lazy(() => import('./pages/ClustersPage'));
const DBTPage = lazy(() => import('./pages/DBTPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const LogsPage = lazy(() => import('./pages/LogsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const SignInPage = lazy(() => import('./pages/SignInPage'));
const SignUpPage = lazy(() => import('./pages/SignUpPage'));

function RouteFallback() {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-accent-cyan border-t-transparent animate-spin" />
    </div>
  );
}

function App() {
  return (
    <Router>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<ChatPage />} />
              <Route path="jobs" element={<JobsPage />} />
              <Route path="pipelines" element={<PipelinesPage />} />
              <Route path="clusters" element={<ClustersPage />} />
              <Route path="dbt" element={<DBTPage />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="logs" element={<LogsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
