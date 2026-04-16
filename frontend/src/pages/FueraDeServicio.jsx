import { useEffect, useState } from 'react';

const FRASES = [
  'Volvemos muy pronto…',
  'Trabajando en ello…',
  'Gracias por tu paciencia…',
  'Casi listo…',
];

export default function FueraDeServicio() {
  const [frase, setFrase] = useState(0);
  const [visible, setVisible] = useState(true);

  // Ciclar frases cada 3 s con fade
  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setFrase((f) => (f + 1) % FRASES.length);
        setVisible(true);
      }, 500);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // Bloquear scroll y back-navigation
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const block = (e) => e.preventDefault();
    window.addEventListener('popstate', block);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('popstate', block);
    };
  }, []);

  return (
    <div
      style={{ fontFamily: "'Inter', sans-serif" }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gray-950 overflow-hidden select-none"
    >
      {/* Fondo animado con burbujas */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(18)].map((_, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              borderRadius: '50%',
              opacity: 0.07 + (i % 5) * 0.03,
              width:  `${60 + (i * 37) % 160}px`,
              height: `${60 + (i * 37) % 160}px`,
              left:   `${(i * 19) % 90}%`,
              top:    `${(i * 23) % 85}%`,
              background: i % 3 === 0
                ? 'radial-gradient(circle, #6366f1, transparent)'
                : i % 3 === 1
                  ? 'radial-gradient(circle, #ec4899, transparent)'
                  : 'radial-gradient(circle, #06b6d4, transparent)',
              animation: `float ${6 + (i % 5)}s ease-in-out infinite alternate`,
              animationDelay: `${(i * 0.4) % 4}s`,
            }}
          />
        ))}
      </div>

      {/* Keyframes inlineados */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
        @keyframes float {
          from { transform: translateY(0px) scale(1); }
          to   { transform: translateY(-30px) scale(1.08); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes spin-rev {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(0.9); opacity: 0.6; }
          70%  { transform: scale(1.15); opacity: 0; }
          100% { transform: scale(0.9); opacity: 0; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-msg {
          transition: opacity 0.45s ease;
        }
      `}</style>

      {/* Icono central con anillos */}
      <div className="relative flex items-center justify-center mb-10">
        {/* Anillo exterior giratorio */}
        <div
          style={{
            width: 160, height: 160,
            border: '2px dashed rgba(99,102,241,0.35)',
            borderRadius: '50%',
            animation: 'spin-slow 18s linear infinite',
            position: 'absolute',
          }}
        />
        {/* Anillo medio giratorio inverso */}
        <div
          style={{
            width: 120, height: 120,
            border: '2px dashed rgba(236,72,153,0.25)',
            borderRadius: '50%',
            animation: 'spin-rev 12s linear infinite',
            position: 'absolute',
          }}
        />
        {/* Pulso */}
        <div
          style={{
            width: 90, height: 90,
            borderRadius: '50%',
            background: 'rgba(99,102,241,0.15)',
            position: 'absolute',
            animation: 'pulse-ring 2.5s ease-out infinite',
          }}
        />
        {/* Icono */}
        <div
          style={{
            width: 80, height: 80,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #ec4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 40px rgba(99,102,241,0.4)',
            position: 'relative', zIndex: 1,
          }}
        >
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
      </div>

      {/* Textos */}
      <div className="text-center px-8 space-y-3" style={{ animation: 'fade-in-up 0.8s ease both' }}>
        <p
          style={{
            fontSize: 11, letterSpacing: 4,
            color: 'rgba(168,85,247,0.8)',
            textTransform: 'uppercase', fontWeight: 600,
          }}
        >
          Servicio no disponible
        </p>
        <h1
          style={{
            fontSize: 'clamp(1.6rem, 5vw, 2.4rem)',
            fontWeight: 900, color: '#f1f5f9',
            lineHeight: 1.2,
          }}
        >
          Temporalmente<br />fuera de servicio
        </h1>
        <p
          style={{
            fontSize: 14, color: 'rgba(148,163,184,0.8)',
            maxWidth: 340, margin: '0 auto', lineHeight: 1.6,
          }}
        >
          Estamos realizando tareas de mantenimiento.<br />
          El acceso será restituido en breve.
        </p>
      </div>

      {/* Frase rotatoria */}
      <div className="mt-8" style={{ height: 28 }}>
        <p
          className="fade-msg"
          style={{
            opacity: visible ? 1 : 0,
            color: 'rgba(99,102,241,0.9)',
            fontSize: 14, fontWeight: 600,
            letterSpacing: 1,
          }}
        >
          {FRASES[frase]}
        </p>
      </div>

      {/* Barra de progreso falsa (loopeada) */}
      <div className="mt-8" style={{ width: 260 }}>
        <div
          style={{
            height: 3,
            borderRadius: 99,
            background: 'rgba(99,102,241,0.12)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              borderRadius: 99,
              background: 'linear-gradient(90deg, #6366f1, #ec4899, #06b6d4)',
              animation: 'progress 3s ease-in-out infinite',
            }}
          />
        </div>
        <style>{`
          @keyframes progress {
            0%   { width: 0%; margin-left: 0; }
            50%  { width: 80%; margin-left: 10%; }
            100% { width: 0%; margin-left: 100%; }
          }
        `}</style>
      </div>

      {/* Footer */}
      <p
        style={{
          position: 'absolute', bottom: 28,
          fontSize: 12, color: 'rgba(100,116,139,0.6)',
          letterSpacing: 0.5,
        }}
      >
        MAINTDV © {new Date().getFullYear()}
      </p>
    </div>
  );
}
