import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import toast from 'react-hot-toast';

const colorMant = (m) => {
  if (m.completado) return 'bg-green-900/80 text-green-300 border-green-700';
  const vencido = new Date(m.fechaHora) < new Date();
  return vencido
    ? 'bg-red-900/80 text-red-300 border-red-700'
    : 'bg-yellow-900/80 text-yellow-300 border-yellow-700';
};

const iconMant = (m) =>
  m.completado ? '✅' : new Date(m.fechaHora) < new Date() ? '🔴' : '🟡';

const DIAS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

export default function TecnicoCalendario() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [mantenimientos, setMantenimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesBase, setMesBase] = useState(new Date());
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  const año = mesBase.getFullYear();
  const mes = mesBase.getMonth();

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/mantenimientos');
      setMantenimientos(data.data);
    } catch {
      toast.error('Error cargando calendario');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const primerDia  = new Date(año, mes, 1).getDay();
  const diasEnMes  = new Date(año, mes + 1, 0).getDate();
  const nombreMes  = mesBase.toLocaleString('es-CO', { month: 'long', year: 'numeric' });

  const prevMes = () => setMesBase(new Date(año, mes - 1, 1));
  const nextMes = () => setMesBase(new Date(año, mes + 1, 1));

  const mDia = (dia) => mantenimientos.filter((m) => {
    const f = new Date(m.fechaHora);
    return f.getDate() === dia && f.getMonth() === mes && f.getFullYear() === año;
  });

  const hoy = new Date();
  const esHoy = (dia) =>
    hoy.getDate() === dia && hoy.getMonth() === mes && hoy.getFullYear() === año;

  const seleccionados = diaSeleccionado ? mDia(diaSeleccionado) : [];

  // Total mantenimientos del mes
  const totalMes = mantenimientos.filter((m) => {
    const f = new Date(m.fechaHora);
    return f.getMonth() === mes && f.getFullYear() === año;
  });

  const completadosMes = totalMes.filter((m) => m.completado).length;
  const pendientesMes  = totalMes.length - completadosMes;

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="page-header justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/tecnico')} className="text-gray-400 hover:text-white p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="font-bold text-white text-sm leading-tight">Mi Calendario</h1>
            <p className="text-gray-400 text-xs">{user?.nombre}</p>
          </div>
        </div>
        <button onClick={logout} className="text-gray-400 hover:text-red-400 p-2 rounded-xl hover:bg-red-950/30 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-4 pb-10">

        {/* KPIs del mes */}
        {!loading && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Total', val: totalMes.length, bg: 'bg-gray-800 border-gray-700', color: 'text-white' },
              { label: 'Completados', val: completadosMes, bg: 'bg-green-950/60 border-green-800', color: 'text-green-400' },
              { label: 'Pendientes', val: pendientesMes, bg: 'bg-yellow-950/60 border-yellow-800', color: 'text-yellow-400' },
            ].map(({ label, val, bg, color }) => (
              <div key={label} className={`rounded-2xl border p-3 text-center ${bg}`}>
                <p className={`text-xl font-bold ${color}`}>{val}</p>
                <p className="text-gray-500 text-[10px] mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Navegación mes */}
        <div className="flex items-center justify-between">
          <button onClick={prevMes} className="p-2 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 active:scale-95 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <p className="text-white font-semibold capitalize text-sm">{nombreMes}</p>
          <button onClick={nextMes} className="p-2 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 active:scale-95 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Cuadrícula calendario */}
        <div className="card p-3">
          {/* Cabecera días */}
          <div className="grid grid-cols-7 mb-2">
            {DIAS.map((d) => (
              <p key={d} className="text-center text-gray-500 text-[11px] font-semibold">{d}</p>
            ))}
          </div>

          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-0.5">
              {/* Espacios vacíos inicio */}
              {[...Array(primerDia)].map((_, i) => <div key={`v-${i}`} />)}

              {/* Días del mes */}
              {[...Array(diasEnMes)].map((_, i) => {
                const dia = i + 1;
                const eventos = mDia(dia);
                const selec = diaSeleccionado === dia;
                const hayCompletados = eventos.some((m) => m.completado);
                const hayPendientes  = eventos.some((m) => !m.completado);
                return (
                  <button
                    key={dia}
                    onClick={() => setDiaSeleccionado(selec ? null : dia)}
                    className={`relative flex flex-col items-center py-1.5 rounded-xl transition-all active:scale-95 ${
                      selec
                        ? 'bg-brand-700 text-white'
                        : esHoy(dia)
                          ? 'bg-brand-900/60 border border-brand-700 text-brand-300'
                          : 'hover:bg-gray-800 text-gray-300'
                    }`}
                  >
                    <span className="text-xs font-medium">{dia}</span>
                    {/* Indicadores de eventos */}
                    {eventos.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {hayCompletados && <div className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                        {hayPendientes  && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detalle del día seleccionado */}
        {diaSeleccionado && (
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
              {diaSeleccionado} de {mesBase.toLocaleString('es-CO', { month: 'long' })}
            </p>
            {seleccionados.length === 0 ? (
              <div className="card text-center py-6 text-gray-600">
                <p className="text-sm">Sin mantenimientos este día</p>
              </div>
            ) : (
              <div className="space-y-2">
                {seleccionados.map((m) => (
                  <button
                    key={m._id}
                    onClick={() => navigate(`/tecnico/mantenimiento/${m._id}`)}
                    className={`w-full card text-left border flex items-center gap-3 active:scale-[0.98] hover:bg-gray-800 transition-all ${colorMant(m)}`}
                  >
                    <span className="text-xl">{iconMant(m)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{m.tipo}</p>
                      <p className="text-xs text-gray-400 truncate">🏪 {m.puntoDeVenta?.nombre}</p>
                      <p className="text-xs text-gray-500">
                        🕐 {new Date(m.fechaHora).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        {m.frecuencia && ` · ${m.frecuencia}`}
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lista completa del mes */}
        {!diaSeleccionado && !loading && totalMes.length > 0 && (
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Todos los eventos del mes
            </p>
            <div className="space-y-2">
              {totalMes
                .sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora))
                .map((m) => (
                  <button
                    key={m._id}
                    onClick={() => navigate(`/tecnico/mantenimiento/${m._id}`)}
                    className={`w-full card text-left border flex items-center gap-3 active:scale-[0.98] hover:bg-gray-800 transition-all ${colorMant(m)}`}
                  >
                    <span className="text-xl">{iconMant(m)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{m.tipo}</p>
                      <p className="text-xs text-gray-400 truncate">🏪 {m.puntoDeVenta?.nombre}</p>
                      <p className="text-xs text-gray-500">
                        📅 {new Date(m.fechaHora).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                        {' · '}
                        {new Date(m.fechaHora).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
