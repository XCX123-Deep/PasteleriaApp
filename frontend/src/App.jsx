import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { AdminRoute, LiderRoute, VisitadorRoute, ProtectedRoute } from './components/ProtectedRoute';

// Pages — Auth
import Login from './pages/Login';

// Pages — Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import PuntosManager from './pages/admin/PuntosManager';
import UsuariosManager from './pages/admin/UsuariosManager';
import AdminReportes from './pages/admin/AdminReportes';
import MantenimientosManager from './pages/admin/MantenimientosManager';
import Calendario from './pages/admin/Calendario';

// Pages — Líder
import LiderDashboard from './pages/lider/LiderDashboard';
import LiderPunto from './pages/lider/LiderPunto';

// Pages — Visitador
import MisPuntos from './pages/visitador/MisPuntos';
import ReporteForm from './pages/visitador/ReporteForm';
import ProximasVisitas from './pages/visitador/ProximasVisitas';

import { useAuth } from './context/AuthContext';

function RootRedirect() {
  const { user, isAdmin, isLider } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin()) return <Navigate to="/admin" replace />;
  if (isLider()) return <Navigate to="/lider" replace />;
  return <Navigate to="/mis-puntos" replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            style: { background: '#1f2937', color: '#f3f4f6', borderRadius: '12px', border: '1px solid #374151', fontSize: '14px' },
            success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />

          {/* Admin */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/puntos" element={<AdminRoute><PuntosManager /></AdminRoute>} />
          <Route path="/admin/usuarios" element={<AdminRoute><UsuariosManager /></AdminRoute>} />
          <Route path="/admin/reportes" element={<AdminRoute><AdminReportes /></AdminRoute>} />
          <Route path="/admin/mantenimientos" element={<AdminRoute><MantenimientosManager /></AdminRoute>} />
          <Route path="/admin/calendario" element={<AdminRoute><Calendario /></AdminRoute>} />

          {/* Líder */}
          <Route path="/lider" element={<LiderRoute><LiderDashboard /></LiderRoute>} />
          <Route path="/lider/punto/:puntoId" element={<LiderRoute><LiderPunto /></LiderRoute>} />

          {/* Visitador */}
          <Route path="/mis-puntos" element={<VisitadorRoute><MisPuntos /></VisitadorRoute>} />
          <Route path="/mis-visitas" element={<ProtectedRoute><ProximasVisitas /></ProtectedRoute>} />
          <Route path="/punto/:puntoId" element={<ProtectedRoute><ReporteForm /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
