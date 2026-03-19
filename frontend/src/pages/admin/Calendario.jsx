import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function Calendario() {
  const navigate = useNavigate();
  const [mantenimientos, setMantenimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesBase, setMesBase] = useState(new Date());

  useEffect(() => {
    api.get('/mantenimientos')
      .then(({ data }) => setMantenimientos(data.data))
      .catch(() => toast.error('Error cargando mantenimientos'))
      .finally(() => setLoading(false));
  }, []);

  const año = mesBase.getFullYear();
  const mes = mesBase.getMonth();

  const primerDia = new Date(año, mes, 1).getDay(); // 0=dom
  const diasEnMes = new Date(año, mes + 1, 0).getDate();

  const nombreMes = mesBase.toLocaleString('es-CO', { month: 'long', year: 'numeric' });

  const prevMes = () => setMesBase(new Date(año, mes - 1, 1));
  const nextMes = () => setMesBase(new Date(año, mes + 1, 1));

  const eventosDelDia = (dia) =>
    mantenimientos.filter((m) => {
      const f = new Date(m.fechaHora);
      return f.getFullYear() === año && f.getMonth() === mes && f.getDate() === dia;
    });

  const colorFrecuencia = (freq) => ({
    UNICA: 'bg-purple-800 text-purple-200',
    SEMANAL: 'bg-blue-800 text-blue-200',
    QUINCENAL: 'bg-cyan-800 text-cyan-200',
    MENSUAL: 'bg-brand-800 text-brand-200',
  }[freq] || 'bg-gray-700 text-gray-300');

  const celdas = Array.from({ length: primerDia === 0 ? 6 : primerDia - 1 }, () => null)
    .concat(Array.from({ length: diasEnMes }, (_, i) => i + 1));

  const hoy = new Date();
  const esHoy = (dia) => hoy.getFullYear() === año && hoy.getMonth() === mes && hoy.getDate() === dia;

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="page-header">
        <button onClick={() => navigate('/admin')} className="text-gray-400 hover:text-white p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="font-bold text-white flex-1">📅 Calendario</h1>
        <button onClick={() => navigate('/admin/mantenimientos')} className="text-gray-400 hover:text-white p-2 text-sm">+ Nuevo</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="p-4">
          {/* Navegación mes */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMes} className="w-9 h-9 flex items-center justify-center bg-gray-800 rounded-xl text-gray-300 active:scale-95">‹</button>
            <span className="text-white font-semibold capitalize text-sm">{nombreMes}</span>
            <button onClick={nextMes} className="w-9 h-9 flex items-center justify-center bg-gray-800 rounded-xl text-gray-300 active:scale-95">›</button>
          </div>

          {/* Encabezados días */}
          <div className="grid grid-cols-7 mb-1">
            {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map((d) => (
              <div key={d} className="text-center text-gray-500 text-xs font-medium py-1">{d}</div>
            ))}
          </div>

          {/* Grid calendario */}
          <div className="grid grid-cols-7 gap-0.5">
            {celdas.map((dia, idx) => {
              if (!dia) return <div key={`empty-${idx}`} />;
              const eventos = eventosDelDia(dia);
              return (
                <div
                  key={dia}
                  className={`min-h-[52px] p-1 rounded-xl flex flex-col ${esHoy(dia) ? 'bg-brand-900/50 border border-brand-600' : 'bg-gray-900'}`}
                >
                  <span className={`text-xs font-semibold mb-0.5 ${esHoy(dia) ? 'text-brand-400' : 'text-gray-400'}`}>{dia}</span>
                  <div className="space-y-0.5 overflow-hidden">
                    {eventos.slice(0, 2).map((m) => (
                      <div
                        key={m._id}
                        title={`${m.tipo} — ${m.puntoDeVenta?.nombre}`}
                        className={`text-[9px] px-1 py-0.5 rounded truncate leading-tight cursor-pointer ${colorFrecuencia(m.frecuencia)} ${m.completado ? 'line-through opacity-50' : ''}`}
                        onClick={() => navigate('/admin/mantenimientos')}
                      >
                        {m.tipo.slice(0, 12)}
                      </div>
                    ))}
                    {eventos.length > 2 && (
                      <span className="text-[9px] text-gray-500">+{eventos.length - 2} más</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Leyenda */}
          <div className="flex flex-wrap gap-2 mt-4">
            {[['UNICA', 'bg-purple-800'], ['SEMANAL', 'bg-blue-800'], ['QUINCENAL', 'bg-cyan-800'], ['MENSUAL', 'bg-brand-800']].map(([label, bg]) => (
              <span key={label} className={`${bg} text-white text-[10px] px-2 py-0.5 rounded-full`}>{label}</span>
            ))}
          </div>

          {/* Lista próximos en el mes */}
          <div className="mt-5">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Este mes</p>
            <div className="space-y-2">
              {mantenimientos
                .filter((m) => {
                  const f = new Date(m.fechaHora);
                  return f.getFullYear() === año && f.getMonth() === mes;
                })
                .sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora))
                .map((m) => (
                  <div key={m._id} className={`card flex items-center gap-3 ${m.completado ? 'opacity-40' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{m.tipo}</p>
                      <p className="text-gray-400 text-xs truncate">🏪 {m.puntoDeVenta?.nombre} · 👤 {m.visitador?.nombre}</p>
                      <p className="text-gray-500 text-xs">
                        📅 {new Date(m.fechaHora).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {m.completado && <span className="text-green-400 text-lg">✓</span>}
                  </div>
                ))}
            </div>
            {mantenimientos.filter((m) => { const f = new Date(m.fechaHora); return f.getFullYear() === año && f.getMonth() === mes; }).length === 0 && (
              <p className="text-gray-600 text-sm text-center py-6">Sin mantenimientos este mes</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
