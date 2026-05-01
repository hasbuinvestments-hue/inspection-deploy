import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';

// Loading Fallback
const PageLoader = () => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-emerald-500 font-bold animate-pulse text-sm">LOADING SECURE MODULE...</p>
    </div>
  </div>
);

// Lazy Pages
const Login = lazy(() => import('./pages/Login/Login'));
const PHO = lazy(() => import('./pages/PHO/PHO'));
const NCCG = lazy(() => import('./pages/NCCG/NCCG'));
const Finance = lazy(() => import('./pages/Finance/Finance'));
const Admin = lazy(() => import('./pages/Admin/Admin'));
const Superadmin = lazy(() => import('./pages/Superadmin/Superadmin'));
const VerifyReport = lazy(() => import('./pages/Verify/VerifyReport'));
const InviteRegistration = lazy(() => import('./pages/Invite/InviteRegistration'));

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/verify" element={<VerifyReport />} />
            <Route path="/verify/:code" element={<VerifyReport />} />
            <Route path="/register-invite/:token" element={<InviteRegistration />} />
            
            <Route path="/pho" element={
              <ProtectedRoute allowedRoles={['pho', 'super_admin']}>
                <PHO />
              </ProtectedRoute>
            } />
            
            <Route path="/nccg" element={
              <ProtectedRoute allowedRoles={['nccg_inspector', 'super_admin']}>
                <NCCG />
              </ProtectedRoute>
            } />
            
            <Route path="/finance" element={
              <ProtectedRoute allowedRoles={['finance_manager', 'super_admin']}>
                <Finance />
              </ProtectedRoute>
            } />
            
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <Admin />
              </ProtectedRoute>
            } />

            <Route path="/superadmin" element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <Superadmin />
              </ProtectedRoute>
            } />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
