/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Home from './pages/Home';
import BlogDetails from './pages/BlogDetails';
import CreateBlog from './pages/CreateBlog';
import EditBlog from './pages/EditBlog';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import { Loader } from 'lucide-react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-40 gap-3">
        <Loader className="w-8 h-8 text-[#0f5132] animate-spin" />
        <p className="text-xs font-semibold text-gray-400">Verifying secure session tokens...</p>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-[#faf9f6] flex flex-col selection:bg-emerald-100 selection:text-emerald-900" id="main-application-wrapper">
          {/* Main Navigation bar */}
          <Header />

          {/* Core Screen Layout router */}
          <main className="flex-1 w-full relative">
            <Routes>
              {/* Public Feed pages */}
              <Route path="/" element={<Home />} />
              <Route path="/posts/:postId" element={<BlogDetails />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Secure composing tools */}
              <Route 
                path="/create" 
                element={
                  <ProtectedRoute>
                    <CreateBlog />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/edit/:postId" 
                element={
                  <ProtectedRoute>
                    <EditBlog />
                  </ProtectedRoute>
                } 
              />
              
              {/* Writer cabin details */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />

              {/* Security space for administrator */}
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />

              {/* Fallback routing */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {/* Humble design credit bar */}
          <footer className="py-8 text-center text-xs text-gray-400 border-t border-gray-100/60 max-w-7xl mx-auto w-full">
            <p>© {new Date().getFullYear()} SageInk Journal. Crafted with absolute core security & responsive elegance.</p>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}
