import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Protege rutas — redirige a login si no hay sesión
export const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Solo ADMIN y SUPER_ADMIN
export const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.rol !== 'ADMIN' && user.rol !== 'SUPER_ADMIN') return <Navigate to="/" replace />;
  return children;
};

// Solo LIDER
export const LiderRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.rol !== 'LIDER') return <Navigate to="/" replace />;
  return children;
};

// Solo VISITADOR
export const VisitadorRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.rol !== 'VISITADOR') return <Navigate to="/" replace />;
  return children;
};
