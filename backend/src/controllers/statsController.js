const Reporte = require('../models/Reporte');
const PuntoDeVenta = require('../models/PuntoDeVenta');
const Mantenimiento = require('../models/Mantenimiento');

// GET /api/stats — Solo ADMIN
const getStats = async (req, res, next) => {
  try {
    const ahora = new Date();

    // Rango: usa parámetros de query o défault últimos 30 días
    const desde = req.query.desde ? new Date(req.query.desde) : new Date(ahora - 30 * 24 * 60 * 60 * 1000);
    const hasta = req.query.hasta ? new Date(new Date(req.query.hasta).setHours(23, 59, 59, 999)) : ahora;

    // Total de puntos activos (siempre global, sin filtro de fecha)
    const totalPuntos = await PuntoDeVenta.countDocuments({ activo: true });

    // Puntos con al menos 1 reporte en el rango
    const puntosConReporte = await Reporte.distinct('puntoDeVenta', {
      fechaVisita: { $gte: desde, $lte: hasta },
    });
    const cumplimiento = totalPuntos > 0
      ? Math.round((puntosConReporte.length / totalPuntos) * 100)
      : 0;

    // Conteo de reportes por estado dentro del rango
    const porEstadoAgg = await Reporte.aggregate([
      { $match: { fechaVisita: { $gte: desde, $lte: hasta } } },
      { $group: { _id: '$estado', count: { $sum: 1 } } },
    ]);
    const estadoMap = { ROJO: 0, NARANJA: 0, VERDE: 0 };
    porEstadoAgg.forEach((e) => { if (estadoMap[e._id] !== undefined) estadoMap[e._id] = e.count; });

    // Evolución semanal dentro del rango
    const evolucion = await Reporte.aggregate([
      { $match: { fechaVisita: { $gte: desde, $lte: hasta } } },
      {
        $group: {
          _id: {
            semana: { $isoWeek: '$fechaVisita' },
            año: { $isoWeekYear: '$fechaVisita' },
          },
          total: { $sum: 1 },
          ROJO: { $sum: { $cond: [{ $eq: ['$estado', 'ROJO'] }, 1, 0] } },
          NARANJA: { $sum: { $cond: [{ $eq: ['$estado', 'NARANJA'] }, 1, 0] } },
          VERDE: { $sum: { $cond: [{ $eq: ['$estado', 'VERDE'] }, 1, 0] } },
        },
      },
      { $sort: { '_id.año': 1, '_id.semana': 1 } },
    ]);

    // Top 5 puntos más problemáticos en el rango
    const coleccionPuntos = PuntoDeVenta.collection.collectionName;
    const topProblematicos = await Reporte.aggregate([
      { $match: { estado: 'ROJO', fechaVisita: { $gte: desde, $lte: hasta } } },
      { $group: { _id: '$puntoDeVenta', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: coleccionPuntos,
          localField: '_id',
          foreignField: '_id',
          as: 'punto',
        },
      },
      { $unwind: '$punto' },
      { $project: { nombre: '$punto.nombre', ciudad: '$punto.ciudad', count: 1 } },
    ]);

    // ── Tiempo promedio de resolución de mantenimientos ──────────────────────
    // Mantenimientos completados en el rango con timestamp válido
    const demoras = await Mantenimiento.aggregate([
      {
        $match: {
          completado: true,
          completadoAt: { $gte: desde, $lte: hasta, $ne: null },
        },
      },
      {
        $project: {
          // Diferencia en milisegundos → convertir a días
          demora: {
            $divide: [{ $subtract: ['$completadoAt', '$createdAt'] }, 1000 * 60 * 60 * 24],
          },
        },
      },
      {
        $group: {
          _id: null,
          promedioDias: { $avg: '$demora' },
          totalCompletados: { $sum: 1 },
        },
      },
    ]);

    const promedioDemora = demoras.length > 0
      ? Math.round(demoras[0].promedioDias * 10) / 10  // 1 decimal
      : null;
    const totalMantenimientosCompletados = demoras.length > 0 ? demoras[0].totalCompletados : 0;

    res.json({
      success: true,
      data: {
        totalPuntos,
        puntosVisitados: puntosConReporte.length,
        cumplimiento,
        porEstado: estadoMap,
        evolucion,
        topProblematicos,
        promedioDemora,          // días promedio (null si no hay datos)
        totalMantenimientosCompletados,
        rango: { desde, hasta },
      },
    });
  } catch (err) { next(err); }
};

module.exports = { getStats };
