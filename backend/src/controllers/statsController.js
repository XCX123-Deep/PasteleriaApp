const Reporte = require('../models/Reporte');
const PuntoDeVenta = require('../models/PuntoDeVenta');

// GET /api/stats — Solo ADMIN
const getStats = async (req, res, next) => {
  try {
    const ahora = new Date();
    const hace30Dias = new Date(ahora - 30 * 24 * 60 * 60 * 1000);

    // Total de puntos activos
    const totalPuntos = await PuntoDeVenta.countDocuments({ activo: true });

    // Puntos con al menos 1 reporte en los últimos 30 días
    const puntosConReporte = await Reporte.distinct('puntoDeVenta', {
      fechaVisita: { $gte: hace30Dias },
    });
    const cumplimiento = totalPuntos > 0
      ? Math.round((puntosConReporte.length / totalPuntos) * 100)
      : 0;

    // Conteo de reportes por estado (todos los reportes)
    const porEstado = await Reporte.aggregate([
      { $group: { _id: '$estado', count: { $sum: 1 } } },
    ]);
    const estadoMap = { ROJO: 0, NARANJA: 0, VERDE: 0 };
    porEstado.forEach((e) => { if (estadoMap[e._id] !== undefined) estadoMap[e._id] = e.count; });

    // Evolución semanal: últimas 4 semanas
    const hace4Semanas = new Date(ahora - 28 * 24 * 60 * 60 * 1000);
    const evolucion = await Reporte.aggregate([
      { $match: { fechaVisita: { $gte: hace4Semanas } } },
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

    // Top 5 puntos más problemáticos (más reportes ROJO recientes)
    const coleccionPuntos = PuntoDeVenta.collection.collectionName; // robusto: usa el nombre real de la colección
    const topProblematicos = await Reporte.aggregate([
      { $match: { estado: 'ROJO', fechaVisita: { $gte: hace30Dias } } },
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

    res.json({
      success: true,
      data: {
        totalPuntos,
        puntosVisitados: puntosConReporte.length,
        cumplimiento,
        porEstado: estadoMap,
        evolucion,
        topProblematicos,
      },
    });
  } catch (err) { next(err); }
};

module.exports = { getStats };
