const express = require('express');
const router = express.Router();
const {
  listarReportes, obtenerReporte, crearReporte, actualizarReporte, eliminarReporte,
} = require('../controllers/reportesController');
const { verifyToken, requireRole } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.use(verifyToken);

router.get('/', listarReportes);
router.get('/:id', obtenerReporte);

// Crear reporte con archivos (fotos[] y firma)
router.post(
  '/',
  upload.fields([{ name: 'fotos', maxCount: 5 }, { name: 'firma', maxCount: 1 }]),
  crearReporte
);

// Actualizar reporte con archivos opcionales
router.put(
  '/:id',
  upload.fields([{ name: 'fotos', maxCount: 5 }, { name: 'firma', maxCount: 1 }]),
  actualizarReporte
);

router.delete('/:id', requireRole('ADMIN'), eliminarReporte);

module.exports = router;
