import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, LineElement, PointElement,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, LineElement, PointElement);

const LS_KEY = 'dashboard_expandido';

// Fecha de hace N días en formato YYYY-MM-DD
const diasAtras = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};
const hoy = () => new Date().toISOString().split('T')[0];

function KpiCard({ icon, label, value, sub, color = 'brand' }) {
  const colors = {
    brand: 'from-brand-600/20 to-brand-400/10 border-brand-500/20 text-brand-300',
    red: 'from-red-950/60 to-red-900/20 border-red-800/40 text-red-400',
    orange: 'from-orange-950/60 to-orange-900/20 border-orange-800/40 text-orange-400',
    green: 'from-green-950/60 to-green-900/20 border-green-800/40 text-green-400',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-2xl p-4 border flex flex-col gap-1 transition-all duration-300`}>
      <p className="text-xs font-medium opacity-80">{icon} {label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs opacity-60">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Persistir estado expand/collapse en localStorage
  const [expandido, setExpandido] = useState(() => {
    const saved = localStorage.getItem(LS_KEY);
    return saved === null ? true : saved === 'true';
  });

  // Filtros de fecha
  const [desde, setDesde] = useState(diasAtras(30));
  const [hasta, setHasta] = useState(hoy());

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Persistir preferencia de colapso
  const toggleExpandido = () => {
    setExpandido((prev) => {
      localStorage.setItem(LS_KEY, String(!prev));
      return !prev;
    });
  };

  // Fetch de stats — reactivo a fechas
  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/stats', { params: { desde, hasta } });
      setStats(data.data);
    } catch {
      toast.error('Error cargando estadísticas');
    } finally {
      setLoading(false);
    }
  }, [desde, hasta]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Presets de rango
  const preset = (dias) => {
    setDesde(diasAtras(dias));
    setHasta(hoy());
  };

  // Datos para gráfico de barras
  const evolucionData = stats?.evolucion?.length > 0 ? {
    labels: stats.evolucion.map((s) => `Sem ${s._id.semana} '${String(s._id.año).slice(2)}`),
    datasets: [
      { label: '🔴 Rojo', data: stats.evolucion.map((s) => s.ROJO), backgroundColor: '#ef4444cc', borderRadius: 6 },
      { label: '🟠 Naranja', data: stats.evolucion.map((s) => s.NARANJA), backgroundColor: '#f97316cc', borderRadius: 6 },
      { label: '🟢 Verde', data: stats.evolucion.map((s) => s.VERDE), backgroundColor: '#22c55ecc', borderRadius: 6 },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    animation: { duration: 400 },
    plugins: {
      legend: { labels: { color: '#9ca3af', font: { size: 11 } } },
      title: { display: false },
    },
    scales: {
      x: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { color: '#1f2937' } },
      y: { ticks: { color: '#6b7280', stepSize: 1 }, grid: { color: '#1f2937' }, beginAtZero: true },
    },
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="page-header justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center">
            <span className="text-lg">🧁</span>
          </div>
          <div>
            <h1 className="font-bold text-white text-sm leading-tight">Panel Admin</h1>
            <p className="text-gray-400 text-xs">{user?.nombre}</p>
          </div>
        </div>
        <button onClick={logout} className="text-gray-400 hover:text-red-400 transition-colors p-2 rounded-xl hover:bg-red-950/30">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-5 pb-8">

        {/* ── Sección Trazabilidad con toggle ─────────────────────────── */}
        <div className="space-y-3">
          {/* Cabecera con toggle */}
          <button
            onClick={toggleExpandido}
            className="w-full flex items-center justify-between group"
          >
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
              📊 Trazabilidad
            </p>
            <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all duration-200 ${
              expandido
                ? 'bg-brand-950/60 border-brand-700 text-brand-300'
                : 'bg-gray-800 border-gray-700 text-gray-500'
            }`}>
              <span>{expandido ? 'Ocultar' : 'Mostrar'}</span>
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-300 ${expandido ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {/* Contenido colapsable */}
          <div className={`overflow-hidden transition-all duration-500 ease-in-out ${expandido ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="space-y-4">

              {/* Filtro de fechas */}
              <div className="card space-y-3">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Filtrar por rango de fechas</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">Desde</label>
                    <input
                      type="date"
                      className="input text-sm"
                      value={desde}
                      max={hasta}
                      onChange={(e) => setDesde(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Hasta</label>
                    <input
                      type="date"
                      className="input text-sm"
                      value={hasta}
                      min={desde}
                      max={hoy()}
                      onChange={(e) => setHasta(e.target.value)}
                    />
                  </div>
                </div>
                {/* Presets */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: '7d', dias: 7 },
                    { label: '30d', dias: 30 },
                    { label: '90d', dias: 90 },
                    { label: '6m', dias: 180 },
                  ].map(({ label, dias }) => (
                    <button
                      key={label}
                      onClick={() => preset(dias)}
                      className="px-3 py-1 text-xs rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 active:scale-95 transition-all"
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    onClick={fetchStats}
                    className="ml-auto px-3 py-1 text-xs rounded-lg bg-brand-900/50 border border-brand-700 text-brand-300 hover:bg-brand-900 active:scale-95 transition-all flex items-center gap-1"
                  >
                    🔄 Actualizar
                  </button>
                </div>
              </div>

              {/* KPIs y gráfica */}
              {loading ? (
                <div className="grid grid-cols-2 gap-3">
                  {[...Array(4)].map((_, i) => <div key={i} className="card animate-pulse h-24 bg-gray-800" />)}
                </div>
              ) : stats && (
                <>
                  {/* KPIs */}
                  <div className="grid grid-cols-2 gap-3">
                    <KpiCard icon="🏪" label="Puntos activos" value={stats.totalPuntos} sub="en total" />
                    <KpiCard icon="✅" label="Cumplimiento" value={`${stats.cumplimiento}%`} sub="en el rango" color="green" />
                    <KpiCard icon="🔴" label="Críticos" value={stats.porEstado.ROJO} sub="en el rango" color="red" />
                    <KpiCard icon="🟠" label="En proceso" value={stats.porEstado.NARANJA} sub="en el rango" color="orange" />
                  </div>

                  {/* Gráfico evolución semanal */}
                  {evolucionData ? (
                    <div>
                      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Evolución semanal</p>
                      <div className="card">
                        <Bar key={`${desde}_${hasta}`} data={evolucionData} options={chartOptions} />
                      </div>
                    </div>
                  ) : (
                    <div className="card text-center py-8 text-gray-600">
                      <span className="text-3xl block mb-2">📭</span>
                      <p className="text-sm">Sin datos en el rango seleccionado</p>
                    </div>
                  )}

                  {/* Top problemáticos */}
                  {stats.topProblematicos?.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">⚠️ Más problemáticos</p>
                      <div className="space-y-2">
                        {stats.topProblematicos.map((p, i) => (
                          <div key={p._id} className="card flex items-center gap-3">
                            <span className="text-gray-600 font-bold text-sm w-5 text-center">#{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium truncate">{p.nombre}</p>
                              <p className="text-gray-500 text-xs">{p.ciudad}</p>
                            </div>
                            <span className="text-red-400 font-bold text-sm flex-shrink-0">🔴 {p.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Acciones rápidas ─────────────────────────────────────────── */}
        <div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Acciones rápidas</p>
          <div className="space-y-2">
            {[
              { label: 'Puntos de Venta', icon: '🏪', path: '/admin/puntos' },
              { label: 'Usuarios', icon: '👥', path: '/admin/usuarios' },
              { label: 'Todos los Reportes', icon: '📋', path: '/admin/reportes' },
              { label: 'Mantenimientos', icon: '🔧', path: '/admin/mantenimientos' },
              { label: 'Calendario', icon: '📅', path: '/admin/calendario' },
            ].map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="w-full card flex items-center gap-4 hover:bg-gray-800 active:bg-gray-700 active:scale-[0.98] transition-all duration-150 text-left"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="font-medium text-gray-200">{item.label}</span>
                <svg className="w-4 h-4 text-gray-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
