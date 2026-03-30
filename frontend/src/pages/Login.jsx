import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { user, login, isAdmin, isLider, isTecnico, loading } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });

  // Redirigir si ya hay sesión activa
  if (user) {
    if (isAdmin())   return <Navigate to="/admin"   replace />;
    if (isLider())   return <Navigate to="/lider"   replace />;
    if (isTecnico()) return <Navigate to="/tecnico" replace />;
    return <Navigate to="/mis-puntos" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error('Completa todos los campos');
      return;
    }
    const result = await login(form.email, form.password);
    if (!result.ok) toast.error(result.message);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6">
      {/* Logo / Header */}
      <div className="mb-8 text-center">
        <img
          src="/logo.png"
          alt="MAINTDV"
          className="w-24 h-24 mx-auto mb-4 rounded-3xl object-contain bg-white p-1.5 shadow-2xl shadow-black/40"
        />
        <h1 className="text-2xl font-bold text-white tracking-wide">MAINTDV</h1>
        <p className="text-gray-400 text-sm mt-1">Sistema de Gestión de Mantenimiento</p>
      </div>

      {/* Card de login */}
      <div className="w-full max-w-sm card">
        <h2 className="text-lg font-semibold text-gray-200 mb-5">Iniciar sesión</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Correo electrónico</label>
            <input
              type="email"
              className="input"
              placeholder="tu@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
              inputMode="email"
            />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="current-password"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary mt-2 disabled:opacity-60">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Ingresando...
              </span>
            ) : (
              'Ingresar'
            )}
          </button>
        </form>
      </div>

      <p className="text-gray-600 text-xs mt-6">
        Acceso solo para personal autorizado
      </p>
    </div>
  );
}
