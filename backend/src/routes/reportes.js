const express = require('express');
const router = express.Router();
const {
  listarReportes, obtenerReporte, crearReporte, actualizarReporte, eliminarReporte, agregarNovedad, agregarObservacion, asignarTecnico,
} = require('../controllers/reportesController');
const { verifyToken, requireRole } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.use(verifyToken);

router.get('/', listarReportes);
router.get('/:id', obtenerReporte);
router.post('/', upload.fields([{ name: 'fotos', maxCount: 5 }, { name: 'firma', maxCount: 1 }]), crearReporte);
router.put('/:id', upload.fields([{ name: 'fotos', maxCount: 5 }, { name: 'firma', maxCount: 1 }]), actualizarReporte);
router.put('/:id/tecnico', requireRole('ADMIN', 'SUPER_ADMIN'), asignarTecnico);
router.post('/:id/novedad', requireRole('TECNICO', 'ADMIN', 'SUPER_ADMIN'), agregarNovedad);
router.post('/:id/observacion', requireRole('ADMIN', 'SUPER_ADMIN'), agregarObservacion);
router.delete('/:id', requireRole('ADMIN', 'SUPER_ADMIN'), eliminarReporte);

module.exports = router;
