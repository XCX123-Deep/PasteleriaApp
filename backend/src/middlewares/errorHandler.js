// Middleware global de manejo de errores
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err);

  // Error de validación de Mongoose
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: messages,
    });
  }

  // Duplicate key error (ej: email duplicado)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `Ya existe un registro con ese ${field}.`,
    });
  }

  // Error de Multer
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: `Error al subir archivo: ${err.message}`,
    });
  }

  // Error genérico
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
  });
};

module.exports = errorHandler;
