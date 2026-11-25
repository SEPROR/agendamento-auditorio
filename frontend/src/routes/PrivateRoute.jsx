import { Navigate } from 'react-router-dom';
import { useAuth } from '../content/AuthContext';

export function PrivateRoute({ children, requireGilog = false,   requireSuperAdmin = false, }) {
  const { loading, autenticado, isGilog, isSuperAdmin  } = useAuth();

  if (loading) {
    return null;
  }

  if (!autenticado) {
    return <Navigate to="/" replace />;
  }

  if (requireGilog && !isGilog) {
    return <Navigate to="/agendamentos" replace />;
  }

    if (requireSuperAdmin && !isSuperAdmin) return <Navigate to="/agendamentos" replace />;


  return children;
}