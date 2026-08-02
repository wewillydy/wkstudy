import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, useToastStore } from './stores';
import { Toasts } from './components/Toast';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import PlayerPage from './pages/PlayerPage';
import AdminPage from './pages/AdminPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.role || user.role === 'student') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <BrowserRouter>
      <Toasts toasts={toasts} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/player/:courseId" element={<ProtectedRoute><PlayerPage /></ProtectedRoute>} />
        <Route path="/admin/*" element={<AdminRoute><AdminPage /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
