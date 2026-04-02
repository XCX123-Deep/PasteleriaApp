const mongoose = require('mongoose');

const mantenimientoSchema = new mongoose.Schema(
  {
    puntoDeVenta: { type: mongoose.Schema.Types.ObjectId, ref: 'PuntoDeVenta', required: true },
    visitador:    { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    tipo:         { type: String, trim: true },                // compat con registros antiguos
    tipos:        [{ type: String, trim: true }],              // múltiples tipos de tarea
    frecuencia:   { type: String, enum: ['SEMANAL', 'QUINCENAL', 'MENSUAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL', 'UNICA'], default: 'MENSUAL' },
    fechaHora:    { type: Date, required: true },
    notas:        { type: String, trim: true },
    completado:   { type: Boolean, default: false },
    completadoAt: { type: Date, default: null },
    activo:       { type: Boolean, default: true },
    // Evidencia del técnico
    fotos:        [{ type: String }],
    firma:        { type: String, default: null },
    novedades: [
      {
        texto:    { type: String, required: true },
        usuario:  { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
        fecha:    { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Mantenimiento', mantenimientoSchema);
