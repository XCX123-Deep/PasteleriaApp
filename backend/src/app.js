const express = require('express');
const path = require('path');
const errorHandler = require('./middlewares/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const usuariosRoutes = require('./routes/usuarios');
const puntosRoutes = require('./routes/puntos');
const reportesRoutes = require('./routes/reportes');
const mantenimientosRoutes = require('./routes/mantenimientos');
const { getStats } = require('./controllers/statsController');
const { verifyToken, requireRole } = require('./middlewares/auth');

const app = express();

// ───── CORS ─────────────────────────────────────────────────────────────────
// Manejamos CORS manualmente para garantizar compatibilidad en Vercel serverless.
// Las peticiones OPTIONS (preflight) deben recibir los headers ANTES de llegar
// a cualquier middleware de autenticación.
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  const allowed = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((u) => u.trim())
    : [];

  const permitir =
    !origin ||                              // curl, Postman, SSR interna
    allowed.includes(origin) ||             // lista explícita
    origin.endsWith('.vercel.app') ||       // cualquier deploy de Vercel
    origin.startsWith('http://localhost');  // desarrollo local

  if (permitir) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  // Responder 204 al preflight OPTIONS inmediatamente
  if (req.method === 'OPTIONS') return res.status(204).end();

  next();
});
// ─────────────────────────────────────────────────────────────────────────────


// Body parsers
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Servir archivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/puntos', puntosRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/mantenimientos', mantenimientosRoutes);
app.get('/api/stats', verifyToken, requireRole('ADMIN'), getStats);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API Pastelería funcionando ✅', timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada.' });
});

// Error handler global
app.use(errorHandler);

module.exports = app;
