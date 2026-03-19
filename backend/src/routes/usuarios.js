const express = require('express');
const router = express.Router();
const { listarUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario } = require('../controllers/usuariosController');
const { verifyToken, requireRole } = require('../middlewares/auth');

router.use(verifyToken, requireRole('ADMIN'));

router.get('/', listarUsuarios);
router.post('/', crearUsuario);
router.put('/:id', actualizarUsuario);
router.delete('/:id', eliminarUsuario);

module.exports = router;
