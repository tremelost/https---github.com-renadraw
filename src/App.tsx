import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Board } from './pages/Board';
import { Login } from './pages/Login';
import { Welcome } from './pages/Welcome';
import { useAuthStore } from './store/authStore';

// Auth Route Component (redirects to board if already logged in)
const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading, isInitialized } = useAuthStore();

  if (!isInitialized || isLoading) {
    return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading...</div>;
  }

  if (user) {
    return <Navigate to="/board" replace />;
  }

  return <>{children}</>;
};

function App() {
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route 
          path="/login" 
          element={
            <AuthRoute>
              <Login />
            </AuthRoute>
          } 
        />
        {/* Board is now completely public */}
        <Route path="/board" element={<Board />} />
        
        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
