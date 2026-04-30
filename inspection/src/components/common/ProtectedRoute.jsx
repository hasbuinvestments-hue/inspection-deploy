import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';

export default function ProtectedRoute({ allowedRoles, children }) {
  const { profile, loading } = useAuth();

  if (loading) return <div>Loading Profile...</div>;
  if (!profile) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(profile.role) && profile.role !== 'super_admin') {
    return <div>Access Denied. Insufficient privileges.</div>;
  }

  return children;
}
