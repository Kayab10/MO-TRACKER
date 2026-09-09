import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useApp } from '../context/AppContext';

export default function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: ReactNode;
  adminOnly?: boolean;
}) {
  const { session } = useApp();
  const loc = useLocation();
  if (!session) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (adminOnly && session.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}
