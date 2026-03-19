// Indicador visual del estado del reporte con colores semáforo
const estadoConfig = {
  ROJO: {
    label: 'No realizado',
    icon: '🔴',
    badge: 'status-badge-rojo',
    bg: 'bg-red-950/60 border-red-800',
    text: 'text-red-400',
    dot: 'bg-red-500',
  },
  NARANJA: {
    label: 'En proceso',
    icon: '🟠',
    badge: 'status-badge-naranja',
    bg: 'bg-orange-950/60 border-orange-800',
    text: 'text-orange-400',
    dot: 'bg-orange-500',
  },
  VERDE: {
    label: 'Completado',
    icon: '🟢',
    badge: 'status-badge-verde',
    bg: 'bg-green-950/60 border-green-800',
    text: 'text-green-400',
    dot: 'bg-green-500',
  },
};

export const EstadoBadge = ({ estado }) => {
  const cfg = estadoConfig[estado] || estadoConfig.ROJO;
  return (
    <span className={cfg.badge}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

export const EstadoSelector = ({ value, onChange }) => {
  return (
    <div className="grid grid-cols-3 gap-2">
      {Object.entries(estadoConfig).map(([key, cfg]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex flex-col items-center py-4 px-2 rounded-2xl border-2 transition-all duration-200 active:scale-95 ${
            value === key
              ? `${cfg.bg} border-current ${cfg.text} shadow-lg`
              : 'bg-gray-800/50 border-gray-700 text-gray-400'
          }`}
        >
          <span className="text-3xl mb-1">{cfg.icon}</span>
          <span className="text-xs font-semibold leading-tight text-center">{cfg.label}</span>
        </button>
      ))}
    </div>
  );
};

export { estadoConfig };
