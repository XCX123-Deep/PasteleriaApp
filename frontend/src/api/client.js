import axios from 'axios';

// Producción: usa VITE_API_URL (configurada en Vercel Dashboard)
// Desarrollo: detecta el hostname automáticamente (funciona en localhost y LAN)
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : `http://${window.location.hostname}:5000/api`;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Adjunta token JWT a todas las peticiones
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Manejo global de errores de respuesta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    // Solo redirigir a /login si el 401 viene de una ruta protegida (no del login mismo)
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
