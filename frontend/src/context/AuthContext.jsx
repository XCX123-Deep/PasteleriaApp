import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

// Helper: comprueba si un JWT está expirado sin librería externa
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Date.now() >= payload.exp * 1000;
  } catch { return true; }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const token = localStorage.getItem('token');
      const u = localStorage.getItem('user');
      if (!token || !u || isTokenExpired(token)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return null;
      }
      return JSON.parse(u);
    } catch { return null; }
  });

  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.usuario));
      setUser(data.data.usuario);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.response?.data?.message || 'Error al iniciar sesión' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const isAdmin = () => user?.rol === 'ADMIN';
  const isVisitador = () => ['VISITADOR', 'LIDER'].includes(user?.rol);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin, isVisitador }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
