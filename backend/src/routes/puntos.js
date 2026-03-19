const express = require('express');
const router = express.Router();
const {
  listarPuntos, obtenerPunto, crearPunto, actualizarPunto, eliminarPunto, asignarUsuarios,
} = require('../controllers/puntosController');
const { verifyToken, requireRole } = require('../middlewares/auth');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Disponible para todos los roles autenticados (controller filtra por rol)
router.get('/', listarPuntos);
router.get('/:id', obtenerPunto);

// Solo ADMIN
router.post('/', requireRole('ADMIN'), crearPunto);
router.put('/:id', requireRole('ADMIN'), actualizarPunto);
router.delete('/:id', requireRole('ADMIN'), eliminarPunto);
router.post('/:id/asignar', requireRole('ADMIN'), asignarUsuarios);

module.exports = router;
