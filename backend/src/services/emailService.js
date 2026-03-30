const nodemailer = require('nodemailer');

// Colores visuales por estado
const estadoInfo = {
  ROJO: { emoji: '🔴', label: 'ROJO', color: '#ef4444', bg: '#450a0a' },
  NARANJA: { emoji: '🟠', label: 'NARANJA', color: '#f97316', bg: '#431407' },
  VERDE: { emoji: '🟢', label: 'VERDE', color: '#22c55e', bg: '#052e16' },
};

// Transporter singleton (se reutiliza entre invocaciones serverless)
let _transporter = null;
function getTransporter() {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true para port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return _transporter;
}

/**
 * Enviar notificación a los administradores cuando se crea o actualiza un reporte.
 * Fire-and-forget: nunca lanza excepción para no interrumpir el flujo principal.
 *
 * @param {Object} reporte  - Documento Reporte ya populado
 * @param {'creado'|'actualizado'} accion
 * @param {string|string[]} to - Email(s) de los administradores a notificar
 */
async function enviarEmailReporte(reporte, accion = 'creado', to) {
  // Resolver destinatario: parámetro > ADMIN_EMAIL de entorno > salir
  const destino = to
    ? (Array.isArray(to) ? to.filter(Boolean).join(', ') : to)
    : process.env.ADMIN_EMAIL;

  if (!process.env.SMTP_HOST || !destino) {
    console.warn('[emailService] SMTP no configurado o sin destinatario — email omitido.');
    return;
  }

  try {
    const info = estadoInfo[reporte.estado] || estadoInfo.ROJO;
    const punto = reporte.puntoDeVenta?.nombre || 'Desconocido';
    const ciudad = reporte.puntoDeVenta?.ciudad || '';
    const visitador = reporte.usuario?.nombre || 'Desconocido';
    const fecha = new Date(reporte.fechaVisita).toLocaleString('es-CO', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const accionLabel = accion === 'creado' ? 'Nuevo reporte creado' : 'Reporte actualizado';

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:24px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1c1c1e;border-radius:16px;overflow:hidden;max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#111827;padding:24px 28px;text-align:center;">
            <p style="margin:0;font-size:28px;">🎂</p>
            <h1 style="margin:8px 0 4px;color:#f9fafb;font-size:18px;font-weight:700;">Pastelería App</h1>
            <p style="margin:0;color:#9ca3af;font-size:13px;">${accionLabel}</p>
          </td>
        </tr>

        <!-- Badge de estado -->
        <tr>
          <td style="padding:24px 28px 0;">
            <div style="background:${info.bg};border:1px solid ${info.color};border-radius:12px;padding:16px;text-align:center;">
              <span style="font-size:32px;">${info.emoji}</span>
              <p style="margin:6px 0 0;color:${info.color};font-size:20px;font-weight:700;letter-spacing:1px;">${info.label}</p>
            </div>
          </td>
        </tr>

        <!-- Detalles -->
        <tr>
          <td style="padding:20px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #2d2d2f;">
                  <span style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Punto de Venta</span><br>
                  <span style="color:#f9fafb;font-size:15px;font-weight:600;">🏪 ${punto}${ciudad ? ` — ${ciudad}` : ''}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #2d2d2f;">
                  <span style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Asesor</span><br>
                  <span style="color:#f9fafb;font-size:15px;">👤 ${visitador}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #2d2d2f;">
                  <span style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Fecha de visita</span><br>
                  <span style="color:#f9fafb;font-size:15px;">📅 ${fecha}</span>
                </td>
              </tr>
              ${reporte.descripcion ? `
              <tr>
                <td style="padding:8px 0;">
                  <span style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Descripción / Hallazgos</span><br>
                  <span style="color:#d1d5db;font-size:14px;line-height:1.5;">${reporte.descripcion}</span>
                </td>
              </tr>` : ''}
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#111827;padding:16px 28px;text-align:center;">
            <p style="margin:0;color:#4b5563;font-size:12px;">Este correo fue generado automáticamente por Pastelería App.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await getTransporter().sendMail({
      from: `"Pastelería App 🎂" <${process.env.SMTP_USER}>`,
      to: destino,
      subject: `${info.emoji} Reporte ${accion}: ${punto} — Estado ${info.label}`,
      html,
    });

    console.log(`[emailService] Email enviado a ${destino} (${accion})`);
  } catch (err) {
    // Logging sin relanzar — el reporte ya fue guardado
    console.error('[emailService] Error enviando email:', err.message);
  }
}

module.exports = { enviarEmailReporte };
