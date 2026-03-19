const mongoose = require('mongoose');

const mantenimientoSchema = new mongoose.Schema(
  {
    puntoDeVenta: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PuntoDeVenta',
      required: [true, 'El punto de venta es requerido'],
    },
    visitador: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'El visitador es requerido'],
    },
    tipo: {
      type: String,
      required: [true, 'El tipo de mantenimiento es requerido'],
      trim: true,
    },
    frecuencia: {
      type: String,
      enum: ['SEMANAL', 'QUINCENAL', 'MENSUAL', 'UNICA'],
      default: 'MENSUAL',
    },
    fechaHora: {
      type: Date,
      required: [true, 'La fecha y hora son requeridas'],
    },
    notas: {
      type: String,
      trim: true,
    },
    completado: {
      type: Boolean,
      default: false,
    },
    activo: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Mantenimiento', mantenimientoSchema);
