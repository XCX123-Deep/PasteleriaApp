const mongoose = require('mongoose');

const reporteSchema = new mongoose.Schema(
  {
    puntoDeVenta: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PuntoDeVenta',
      required: [true, 'El punto de venta es requerido'],
    },
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'El usuario es requerido'],
    },
    estado: {
      type: String,
      enum: ['ROJO', 'NARANJA', 'VERDE'],
      default: 'ROJO',
      required: true,
    },
    descripcion: {
      type: String,
      trim: true,
      default: '',
    },
    fotos: [
      {
        type: String, // URL/path de la imagen
      },
    ],
    firma: {
      type: String, // URL/path de la firma
      default: null,
    },
    fechaVisita: {
      type: Date,
      default: Date.now,
    },
    novedades: [
      {
        texto: { type: String, required: true, trim: true },
        usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
        fecha: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Índices para filtros frecuentes
reporteSchema.index({ puntoDeVenta: 1, estado: 1 });
reporteSchema.index({ usuario: 1 });
reporteSchema.index({ fechaVisita: -1 });

module.exports = mongoose.model('Reporte', reporteSchema);
