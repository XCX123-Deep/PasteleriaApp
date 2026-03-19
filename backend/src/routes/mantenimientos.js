const express = require('express');
const router = express.Router();
const { listar, crear, actualizar, eliminar } = require('../controllers/mantenimientosController');
const { verifyToken, requireRole } = require('../middlewares/auth');

router.use(verifyToken);

router.get('/', listar);
router.post('/', requireRole('ADMIN'), crear);
router.put('/:id', requireRole('ADMIN'), actualizar);
router.delete('/:id', requireRole('ADMIN'), eliminar);

module.exports = router;
