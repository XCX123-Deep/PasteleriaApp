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

// CORS — lista blanca en producción, abierto en desarrollo
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL || false
    : true,
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
