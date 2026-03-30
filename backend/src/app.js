const express = require('express');
const cors = require('cors');
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

// CORS — acepta FRONTEND_URL (separado por comas) o cualquier *.vercel.app como fallback
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((u) => u.trim())
  : [];

const corsOptions = {
  origin: (origin, cb) => {
    // Sin origin → Postman, curl, Vercel serverless interno
    if (!origin) return cb(null, true);
    // Lista explícita configurada
    if (allowedOrigins.length > 0 && allowedOrigins.includes(origin)) return cb(null, true);
    // Fallback: cualquier subdominio de vercel.app (mismo proyecto)
    if (origin.endsWith('.vercel.app')) return cb(null, true);
    // Desarrollo local
    if (origin.startsWith('http://localhost')) return cb(null, true);
    cb(new Error(`CORS: origen no permitido → ${origin}`));
  },
  credentials: true,
};
app.use(cors(corsOptions));

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
