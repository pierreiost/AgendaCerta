import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Courts from './pages/Courts';
import Clients from './pages/Clients';
import Reservations from './pages/Reservations';
import Products from './pages/Products';
import Tabs from './pages/Tabs';
import TabDetails from './pages/TabDetails';
import Profile from './pages/Profile';
import Users from './pages/Users';
import Notifications from './pages/Notifications';
import SuperAdminPanel from './pages/SuperAdminPanel';
import { SuperAdminRoute, SystemRoute } from './components/RoleRoute';
import './styles/App.css';

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <div className="loading" style={{ width: '50px', height: '50px', borderWidth: '5px' }}></div>
      </div>
    );
  }

  if (user) {
    if (user.role === 'SUPER_ADMIN') {
      return <Navigate to="/super-admin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const RedirectByRole = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <div className="loading" style={{ width: '50px', height: '50px', borderWidth: '5px' }}></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'SUPER_ADMIN') {
    return <Navigate to="/super-admin" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rotas Públicas */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />

          {/* Rotas do Sistema (ADMIN e SEMI_ADMIN apenas) */}
          <Route
            path="/dashboard"
            element={
              <SystemRoute>
                <Dashboard />
              </SystemRoute>
            }
          />
          <Route
            path="/users"
            element={
              <SystemRoute>
                <Users />
              </SystemRoute>
            }
          />
          <Route
            path="/courts"
            element={
              <SystemRoute>
                <Courts />
              </SystemRoute>
            }
          />
          <Route
            path="/courts/:id"
            element={
              <SystemRoute>
                <Courts />
              </SystemRoute>
            }
          />
          <Route
            path="/clients"
            element={
              <SystemRoute>
                <Clients />
              </SystemRoute>
            }
          />
          <Route
            path="/reservations"
            element={
              <SystemRoute>
                <Reservations />
              </SystemRoute>
            }
          />
          <Route
            path="/agenda"
            element={
              <SystemRoute>
                <Reservations />
              </SystemRoute>
            }
          />
          <Route
            path="/products"
            element={
              <SystemRoute>
                <Products />
              </SystemRoute>
            }
          />
          <Route
            path="/tabs"
            element={
              <SystemRoute>
                <Tabs />
              </SystemRoute>
            }
          />
          <Route
            path="/tabs/:id"
            element={
              <SystemRoute>
                <TabDetails />
              </SystemRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <SystemRoute>
                <Profile />
              </SystemRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <SystemRoute>
                <Notifications />
              </SystemRoute>
            }
          />

          {/* Rota do Super Admin (apenas SUPER_ADMIN) */}
          <Route
            path="/super-admin"
            element={
              <SuperAdminRoute>
                <SuperAdminPanel />
              </SuperAdminRoute>
            }
          />

          {/* Rotas de Redirecionamento */}
          <Route path="/" element={<RedirectByRole />} />
          <Route path="*" element={<RedirectByRole />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;