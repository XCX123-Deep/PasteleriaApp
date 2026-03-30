const express = require('express');
const router = express.Router();
const { listar, crear, actualizar, eliminar, completarMantenimiento } = require('../controllers/mantenimientosController');
const { verifyToken, requireRole } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');

router.use(verifyToken);

router.get('/', listar);
router.post('/', requireRole('ADMIN'), crear);
router.put('/:id', requireRole('ADMIN'), actualizar);
router.delete('/:id', requireRole('ADMIN'), eliminar);

// TÉCNICO actualiza su propio mantenimiento (fotos, firma, notas, completado)
router.patch('/:id/completar',
  requireRole(['ADMIN', 'SUPER_ADMIN', 'TECNICO']),
  upload.fields([{ name: 'fotos', maxCount: 5 }, { name: 'firma', maxCount: 1 }]),
  completarMantenimiento
);

module.exports = router;
