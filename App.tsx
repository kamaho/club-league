import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ForgotPassword } from './pages/ForgotPassword';
import { Home } from './pages/Home';
import { Standings } from './pages/Standings';
import { MatchDetail } from './pages/MatchDetail';
import { Profile } from './pages/Profile';
import { Admin } from './pages/Admin';
import { AdminDivision } from './pages/AdminDivision';
import { Matches } from './pages/Matches';
import { Friendlies } from './pages/Friendlies';
import { RatingInfo } from './pages/RatingInfo';
import { authService } from './services/auth';
import { UserRole } from './types';
import { AppProvider } from './context/AppContext';

// Protected Route Wrapper
const ProtectedRoute = ({ children, requiredRole }: { children?: React.ReactNode; requiredRole?: UserRole }) => {
  const user = authService.getCurrentUser();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />
          
          <Route path="/matches" element={
            <ProtectedRoute>
              <Matches />
            </ProtectedRoute>
          } />

          <Route path="/friendlies" element={
            <ProtectedRoute>
              <Friendlies />
            </ProtectedRoute>
          } />

          <Route path="/standings" element={
            <ProtectedRoute>
              <Standings />
            </ProtectedRoute>
          } />

          <Route path="/match/:id" element={
            <ProtectedRoute>
              <MatchDetail />
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          
          <Route path="/rating-info" element={
            <ProtectedRoute>
              <RatingInfo />
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <Admin />
            </ProtectedRoute>
          } />

          <Route path="/admin/divisions/:id" element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <AdminDivision />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AppProvider>
  );
};

export default App;