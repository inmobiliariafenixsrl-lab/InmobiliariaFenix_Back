const { Resend } = require('resend');
const { query } = require("../../db");

class EmailService {
  constructor() {
    // Verificar que la API key existe
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ ERROR: Falta RESEND_API_KEY en .env');
    }
    
    // Inicializar Resend
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async getAgentesEmails() {
    const sql = `
      SELECT email, nombre, apellido 
      FROM agente 
      WHERE estado = 'activo' 
      AND rol != 'moderador'
      AND email IS NOT NULL 
      AND email != ''
    `;
    
    const result = await query(sql);
    return result.rows;
  }

  async sendPropertyApprovedEmail(propertyId, propertyTitle) {
    try {
      // Verificar configuración antes de enviar
      if (!process.env.RESEND_API_KEY) {
        throw new Error('Configuración de Resend incompleta: falta RESEND_API_KEY');
      }
      
      const agentes = await this.getAgentesEmails();
      
      if (agentes.length === 0) {
        console.log('No hay agentes para notificar');
        return { success: true, count: 0 };
      }

      const baseUrl = process.env.APP_URL || 'https://inmobiliriafenix.netlify.app';
      const propertyUrl = `${baseUrl}/inmuebles`;
      
      const subject = `✨ Nuevo inmueble disponible: ${propertyTitle}`;
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px 20px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .content {
              background-color: white;
              padding: 30px;
              border-radius: 0 0 10px 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .property-title {
              color: #667eea;
              font-size: 24px;
              margin: 20px 0;
              text-align: center;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: linear-gradient(135deg, #FFD700 0%, #DAA520 100%);
              color: white !important;
              text-decoration: none;
              border-radius: 25px;
              margin: 20px 0;
              font-weight: bold;
              text-align: center;
              box-shadow: 0 4px 12px rgba(218, 165, 32, 0.3);
              transition: transform 0.2s ease, opacity 0.2s ease;
            }
            .button:hover {
              transform: translateY(-2px);
              opacity: 0.9;
              box-shadow: 0 6px 16px rgba(218, 165, 32, 0.4);
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 12px;
              color: #999;
              text-align: center;
            }
            .highlight {
              background-color: #f0f0f0;
              padding: 10px;
              border-radius: 5px;
              font-size: 12px;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏠 Inmobiliaria Fenix</h1>
              <p>¡Nueva propiedad disponible!</p>
            </div>
            <div class="content">
              <p>Hola <strong>${agentes[0]?.nombre || 'Agente'}</strong>,</p>
              
              <p>Tenemos una <strong>nueva propiedad</strong> que ha sido aprobada y está disponible en el sistema:</p>
              
              <div class="property-title">
                "📌 ${propertyTitle}"
              </div>
              
              <p>✅ <strong>Estado:</strong> Aprobada y activa<br>
              🏢 <strong>Tipo:</strong> Inmueble en venta/alquiler</p>
              
              <p>Te invitamos a revisar los detalles de esta propiedad iniciando sesión en el sistema:</p>
              
              <div style="text-align: center;">
                <a href="${propertyUrl}" class="button" style="color: white;">
                  🔍 Ver Listado de Inmuebles
                </a>
              </div>
              
              <div class="highlight">
                <strong>🔗 Enlace directo:</strong><br>
                <a href="${propertyUrl}" style="color: #DAA520;">${propertyUrl}</a>
              </div>
            </div>
            <div class="footer">
              <p>Este es un mensaje automático del sistema de gestión de Inmobiliaria Fenix.<br>
              Por favor, no respondas a este correo.</p>
              <p>&copy; ${new Date().getFullYear()} Inmobiliaria Fenix - Todos los derechos reservados</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Obtener array de emails
      const emails = agentes.map(a => a.email);
      
      // Enviar con Resend (puede enviar a múltiples destinatarios directamente)
      const { data, error } = await this.resend.emails.send({
        from: 'Inmobiliaria Fenix <onboarding@resend.dev>', // Dominio temporal de Resend
        to: emails, // Resend acepta array de destinatarios
        subject: subject,
        html: html,
      });

      if (error) {
        throw error;
      }

      console.log(`✅ Correo enviado exitosamente a ${agentes.length} agentes via Resend`);
      console.log(`📧 Propiedad: ${propertyTitle}`);
      console.log(`👥 Destinatarios: ${emails.join(', ')}`);
      console.log(`📨 ID del correo: ${data?.id}`);
      
      return { success: true, count: agentes.length, messageId: data?.id };
      
    } catch (error) {
      console.error("❌ Error enviando correo con Resend:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();