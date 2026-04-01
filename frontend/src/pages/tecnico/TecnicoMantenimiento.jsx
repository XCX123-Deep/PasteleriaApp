import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function TecnicoMantenimiento() {
  const { mantenimientoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mant, setMant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Campos editables
  const [notas, setNotas] = useState('');
  const [novedad, setNovedad] = useState('');
  const [completado, setCompletado] = useState(false);
  const [fotos, setFotos] = useState([]); // File[]
  const [previews, setPreviews] = useState([]);
  const [firmaDataUrl, setFirmaDataUrl] = useState(null);

  // Canvas firma
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const lastPos = useRef(null);

  useEffect(() => {
    const fetchMant = async () => {
      try {
        const { data } = await api.get(`/mantenimientos/${mantenimientoId}`);
        const found = data.data;
        if (!found) { toast.error('Mantenimiento no encontrado'); navigate(-1); return; }
        setMant(found);
        setNotas(found.notas || '');
        setCompletado(found.completado || false);
        if (found.firma) setFirmaDataUrl(found.firma);
      } catch (err) {
        if (err.response?.status === 404 || err.response?.status === 403) navigate(-1);
        toast.error('Error cargando mantenimiento');
      }
      finally { setLoading(false); }
    };
    fetchMant();
  }, [mantenimientoId, navigate]);

  // ── Foto handlers ──────────────────────────────────────────────
  const handleFotos = (e) => {
    const files = Array.from(e.target.files);
    setFotos((prev) => [...prev, ...files]);
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (ev) => setPreviews((prev) => [...prev, ev.target.result]);
      reader.readAsDataURL(f);
    });
    e.target.value = '';
  };

  const quitarFoto = (i) => {
    setFotos((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  // ── Canvas firma ─ con passive:false para poder hacer preventDefault ───────
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const startDraw = (e) => {
    drawing.current = true;
    lastPos.current = getPos(e, canvasRef.current);
  };

  const drawLine = (e) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    lastPos.current = pos;
  };

  const endDraw = () => {
    if (!drawing.current) return;
    drawing.current = false;
    setFirmaDataUrl(canvasRef.current.toDataURL('image/png'));
  };

  const limpiarFirma = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setFirmaDataUrl(null);
  };

  // Registrar touch events con passive:false para poder hacer preventDefault y evitar scroll
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onTouchStart = (e) => { e.preventDefault(); startDraw(e); };
    const onTouchMove  = (e) => { e.preventDefault(); drawLine(e); };
    const onTouchEnd   = (e) => { e.preventDefault(); endDraw(); };
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',   onTouchEnd,   { passive: false });
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove',  onTouchMove);
      canvas.removeEventListener('touchend',   onTouchEnd);
    };
  }, [mant]); // re-attach when mant loads

  // ── Guardar ────────────────────────────────────────────────────
  const handleGuardar = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('notas', notas);
      fd.append('completado', String(completado));
      if (novedad.trim()) fd.append('novedad', novedad.trim());
      fotos.forEach((f) => fd.append('fotos', f));

      // Firma: convertir dataUrl a Blob
      if (firmaDataUrl && firmaDataUrl.startsWith('data:')) {
        const res = await fetch(firmaDataUrl);
        const blob = await res.blob();
        fd.append('firma', blob, 'firma.png');
      }

      await api.patch(`/mantenimientos/${mantenimientoId}/completar`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Mantenimiento actualizado ✅');
      setNovedad('');
      setFotos([]);
      setPreviews([]);
      navigate(-1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!mant) return null;

  const fechaStr = new Date(mant.fechaHora).toLocaleString('es-CO', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="page-header justify-between">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="font-bold text-white flex-1 ml-3 text-sm">Gestionar Mantenimiento</h1>
      </div>

      <div className="p-4 space-y-5 pb-10">

        {/* Info + estado */}
        <div className="card space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-brand-400 font-bold text-base flex-1">{mant.tipo}</p>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${
              mant.completado
                ? 'bg-green-950 text-green-400 border border-green-700'
                : new Date(mant.fechaHora) < new Date()
                  ? 'bg-red-950 text-red-400 border border-red-700'
                  : 'bg-yellow-950 text-yellow-400 border border-yellow-700'
            }`}>
              {mant.completado ? '✅ Completado' : new Date(mant.fechaHora) < new Date() ? '🔴 Vencido' : '🟡 Pendiente'}
            </span>
          </div>
          <p className="text-gray-400 text-sm">🏪 {mant.puntoDeVenta?.nombre} — {mant.puntoDeVenta?.ciudad}</p>
          <p className="text-gray-500 text-xs">📅 {fechaStr}</p>
          {mant.frecuencia && <p className="text-gray-600 text-xs">🔁 {mant.frecuencia}</p>}
        </div>

        {/* Toggle Completado */}
        <button
          onClick={() => setCompletado((v) => !v)}
          className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
            completado
              ? 'bg-green-950/60 border-green-700 text-green-400'
              : 'bg-gray-800 border-gray-700 text-gray-400'
          }`}
        >
          <span className="font-semibold text-sm">
            {completado ? '✅ Marcado como completado' : '⬜ Marcar como completado'}
          </span>
          <div className={`w-10 h-6 rounded-full transition-all relative ${completado ? 'bg-green-500' : 'bg-gray-600'}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${completado ? 'left-5' : 'left-1'}`} />
          </div>
        </button>

        {/* Notas */}
        <div>
          <label className="label">Notas / Observaciones</label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="Describe el trabajo realizado..."
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
        </div>

        {/* Novedad */}
        <div>
          <label className="label">Añadir novedad</label>
          <textarea
            className="input resize-none"
            rows={2}
            placeholder="Anomalías encontradas, observaciones adicionales..."
            value={novedad}
            onChange={(e) => setNovedad(e.target.value)}
          />
        </div>

        {/* Novedades previas */}
        {mant.novedades?.length > 0 && (
          <div className="space-y-2">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Novedades anteriores</p>
            {mant.novedades.map((n, i) => (
              <div key={i} className="card border-l-2 border-brand-600 py-2">
                <p className="text-gray-200 text-sm">{n.texto}</p>
                <p className="text-gray-600 text-xs mt-1">{n.usuario?.nombre} · {new Date(n.fecha).toLocaleDateString('es-CO')}</p>
              </div>
            ))}
          </div>
        )}

        {/* Fotos */}
        <div>
          <label className="label">Evidencia fotográfica</label>
          <label className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-dashed border-gray-700 text-gray-400 hover:border-brand-600 hover:text-brand-400 transition-all cursor-pointer active:scale-[0.98]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-medium">Tomar / Agregar fotos</span>
            <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={handleFotos} />
          </label>

          {/* Fotos existentes */}
          {mant.fotos?.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {mant.fotos.map((url, i) => (
                <img key={i} src={url} alt={`foto-${i}`} className="w-full h-24 object-cover rounded-xl" />
              ))}
            </div>
          )}

          {/* Nuevas fotos */}
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {previews.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} alt="preview" className="w-full h-24 object-cover rounded-xl" />
                  <button
                    onClick={() => quitarFoto(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-600 rounded-full text-white text-xs flex items-center justify-center"
                  >✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Firma */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Firma</label>
            <button onClick={limpiarFirma} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
              Limpiar
            </button>
          </div>
          {firmaDataUrl && !firmaDataUrl.startsWith('data:') ? (
            <img src={firmaDataUrl} alt="Firma existente" className="w-full h-32 object-contain rounded-2xl bg-white border border-gray-700" />
          ) : null}
          <canvas
          className="w-full rounded-2xl bg-gray-900 border border-gray-700 touch-none"
            ref={canvasRef}
            width={380}
            height={140}
            onMouseDown={startDraw}
            onMouseMove={drawLine}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
          />
          <p className="text-gray-600 text-xs text-center mt-1">Firma aquí con el dedo</p>
        </div>

        {/* Botón guardar */}
        <button
          onClick={handleGuardar}
          disabled={saving}
          className="btn-primary w-full disabled:opacity-60 mt-2"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Guardando...
            </span>
          ) : '💾 Guardar cambios'}
        </button>
      </div>
    </div>
  );
}
