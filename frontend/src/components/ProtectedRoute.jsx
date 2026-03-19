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
  if (user.rol !== 'ADMIN' && user.rol !== 'SUPER_ADMIN') return <Navigate to="/mis-puntos" replace />;
  return children;
};

// Solo Visitador/Líder
export const VisitadorRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.rol === 'ADMIN' || user.rol === 'SUPER_ADMIN') return <Navigate to="/admin" replace />;
  return children;
};
