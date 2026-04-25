const { query } = require("../../db");
const emailService = require("./EmailService");

class DocumentManagementService {
  async getPropertiesInReview(user) {
    let sql = `
      SELECT 
        i.*,
        a.nombre as agente_nombre,
        a.apellido as agente_apellido,
        a.idgrupo as agente_idgrupo,
        g.nombre as grupo_nombre,
        g.idlider as grupo_lider
      FROM inmueble i
      LEFT JOIN agente a ON i.idagente = a.idagente
      LEFT JOIN grupo g ON a.idgrupo = g.idgrupo
      WHERE i.estado = 'en revisión'
    `;
    
    const params = [];
    
    switch (user.rol) {
      case 'moderador':
        sql += ` AND a.idgrupo IS NULL`;
        break;
            
      case 'team_leader':
        sql += ` AND g.idlider = $1`;
        params.push(user.idagente);
        break;
            
      default:
        break;
    }
    
    sql += ` ORDER BY i.fecha_creacion DESC`;
    
    const result = await query(sql, params);
    
    return result.rows.map(property => ({
      ...property,
      imagenes: ["/images/casa.jpg"]
    }));
  }

  async getPropertyById(propertyId) {
    const sql = `
      SELECT 
        i.*,
        a.nombre as agente_nombre,
        a.apellido as agente_apellido
      FROM inmueble i
      LEFT JOIN agente a ON i.idagente = a.idagente
      WHERE i.idinmueble = $1
    `;
    
    const result = await query(sql, [propertyId]);
    
    if (result.rows.length === 0) {
      throw new Error("Propiedad no encontrada");
    }
    
    return {
      ...result.rows[0],
      imagenes: ["/images/casa.jpg"]
    };
  }

  async getPropertyDocuments(propertyId) {
    const sql = `
      SELECT 
        d.iddocumento as "idDocumento",
        d.idinmueble as "idInmueble",
        dt.nombre as "tipo",
        d.nombre_archivo as "nombre_documento"
      FROM documento d
      INNER JOIN documento_tipo dt ON d.idtipo_documento = dt.idtipo_documento
      WHERE d.idinmueble = $1
      ORDER BY dt.idtipo_documento
    `;
    
    const result = await query(sql, [propertyId]);
    
    return result.rows.map(doc => ({
      ...doc,
      estado: "pendiente"
    }));
  }

  async getDocumentFile(documentId) {
    const infoSql = `
      SELECT 
        d.iddocumento,
        d.nombre_archivo,
        d.pdf as archivo,
        dt.nombre as tipo_documento
      FROM documento d
      INNER JOIN documento_tipo dt ON d.idtipo_documento = dt.idtipo_documento
      WHERE d.iddocumento = $1
    `;
    
    const infoResult = await query(infoSql, [documentId]);
    
    if (infoResult.rows.length === 0) {
      throw new Error("Documento no encontrado");
    }
    
    const doc = infoResult.rows[0];
    
    if (doc.archivo && doc.archivo.length > 0) {
      return {
        fileBuffer: doc.archivo,
        fileName: doc.nombre_archivo,
        mimeType: 'application/pdf'
      };
    }
    
    const fs = require('fs');
    const path = require('path');
    
    const possiblePaths = [
      path.join(__dirname, '../../uploads/documentos', doc.nombre_archivo),
      path.join(__dirname, '../uploads/documentos', doc.nombre_archivo),
      path.join(process.cwd(), 'uploads/documentos', doc.nombre_archivo),
      path.join(process.cwd(), 'public/uploads/documentos', doc.nombre_archivo)
    ];
    
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        const fileBuffer = fs.readFileSync(filePath);
        return {
          fileBuffer: fileBuffer,
          fileName: doc.nombre_archivo,
          mimeType: 'application/pdf'
        };
      }
    }
    
    throw new Error("Archivo no encontrado en el sistema");
  }

  async getReviewHistory(reviewerId, userRole) {
    let sql = `
      SELECT 
        r.idinmueble_revision as id,
        r.idinmueble as "propertyId",
        i.titulo as "propertyTitle",
        i.direccion,
        i.operacion,
        i.tipo_propiedad,
        i.m2_construccion,
        i.m2_terreno,
        i.nro_habitaciones,
        i.nro_baños,
        i.nro_estacionamiento,
        i.año_construccion,
        i.ascensor,
        i.garaje,
        i.terraza,
        i.piscina,
        i.descripcion,
        i.precio_capatacion_m,
        i.precio_capatacion_s,
        i.precio_captacion_i,
        i.tipo_cambio_captacion,
        r.fecha_revision as "reviewedAt",
        CONCAT(rev.nombre, ' ', rev.apellido) as "reviewedBy",
        rev.idagente as "reviewedById",
        CONCAT(ag.nombre, ' ', ag.apellido) as "agente_nombre",
        ag.apellido as "agente_apellido",
        i.estado,
        i.observacion as observation
      FROM inmueble_revision r
      INNER JOIN inmueble i ON r.idinmueble = i.idinmueble
      INNER JOIN agente rev ON r.idagente = rev.idagente
      LEFT JOIN agente ag ON i.idagente = ag.idagente
    `;
    
    const params = [];
    
    if (userRole !== 'administrador') {
      sql += ` WHERE r.idagente = $1`;
      params.push(reviewerId);
    }
    
    sql += ` ORDER BY r.fecha_revision DESC LIMIT 100`;
    
    const result = await query(sql, params);
    
    const historyWithCounts = await Promise.all(result.rows.map(async (row) => {
      const docsCount = await query(
        `SELECT COUNT(*) as total FROM documento WHERE idinmueble = $1`,
        [row.propertyId]
      );
      
      return {
        id: row.id,
        propertyId: row.propertyId,
        propertyTitle: row.propertyTitle,
        propertyImage: "/images/casa.jpg",
        reviewedAt: row.reviewedAt,
        reviewedBy: row.reviewedBy,
        reviewedById: row.reviewedById,
        status: row.estado === 'activo' ? 'aprobado' : 'rechazado',
        observation: row.observation,
        documentsReviewed: row.estado === 'activo' ? parseInt(docsCount.rows[0].total) : 0,
        totalDocuments: parseInt(docsCount.rows[0].total),
        agente_nombre: row.agente_nombre,
        agente_apellido: row.agente_apellido,
        direccion: row.direccion,
        operacion: row.operacion,
        tipo_propiedad: row.tipo_propiedad,
        m2_construccion: row.m2_construccion,
        m2_terreno: row.m2_terreno,
        nro_habitaciones: row.nro_habitaciones,
        nro_baños: row.nro_baños,
        nro_estacionamiento: row.nro_estacionamiento,
        año_construccion: row.año_construccion,
        ascensor: row.ascensor,
        garaje: row.garaje,
        terraza: row.terraza,
        piscina: row.piscina,
        descripcion: row.descripcion,
        precio_capatacion_m: row.precio_capatacion_m,
        precio_capatacion_s: row.precio_capatacion_s,
        precio_captacion_i: row.precio_captacion_i,
        tipo_cambio_captacion: row.tipo_cambio_captacion
      };
    }));
    
    return historyWithCounts;
  }

  // Método privado para actualizar o insertar registro en inmueble_revision
  async _upsertPropertyRevision(propertyId, reviewerId) {
    const checkSql = `SELECT idinmueble_revision FROM inmueble_revision WHERE idinmueble = $1`;
    const checkResult = await query(checkSql, [propertyId]);
    
    if (checkResult.rows.length > 0) {
      const updateSql = `
        UPDATE inmueble_revision 
        SET idagente = $1, fecha_revision = NOW()
        WHERE idinmueble = $2
        RETURNING idinmueble_revision
      `;
      const updateResult = await query(updateSql, [reviewerId, propertyId]);
      return updateResult.rows[0].idinmueble_revision;
    } else {
      const insertSql = `
        INSERT INTO inmueble_revision (idagente, idinmueble, fecha_revision)
        VALUES ($1, $2, NOW())
        RETURNING idinmueble_revision
      `;
      const insertResult = await query(insertSql, [reviewerId, propertyId]);
      return insertResult.rows[0].idinmueble_revision;
    }
  }

  // Método para obtener los emails de los agentes
  async getAgentesEmails() {
    const sql = `
      SELECT email, nombre, apellido, idagente
      FROM agente 
      WHERE estado = 'activo' 
      AND rol != 'moderador'
      AND email IS NOT NULL 
      AND email != ''
    `;
    
    const result = await query(sql);
    return result.rows;
  }

  // Método que genera la URL de Gmail con el mensaje pre-cargado
  async generateGmailUrl(propertyId, propertyTitle) {
    const agentes = await this.getAgentesEmails();
    
    if (agentes.length === 0) {
      return null;
    }

    const baseUrl = process.env.APP_URL || 'https://inmobiliriafenix.netlify.app';
    const propertyUrl = `${baseUrl}/inmuebles`;
    
    // Construir el cuerpo del correo en texto plano (para mailto:)
    const subject = encodeURIComponent(`✨ Nuevo inmueble disponible: ${propertyTitle}`);
    
    const emailBody = `
Hola,

Tenemos una NUEVA PROPIEDAD que ha sido aprobada y está disponible en el sistema:

"📌 ${propertyTitle}"

✅ Estado: Aprobada y activa
🏢 Tipo: Inmueble en venta/alquiler

Te invitamos a revisar los detalles de esta propiedad iniciando sesión en el sistema:

🔍 Ver Listado de Inmuebles: ${propertyUrl}

---
Este es un mensaje automático del sistema de gestión de Inmobiliaria Fenix.
    `.trim();
    
    const body = encodeURIComponent(emailBody);
    
    // Obtener todos los emails separados por coma
    const emails = agentes.map(a => a.email).join(',');
    
    // Construir URL mailto: para abrir en Gmail (si el usuario tiene Gmail como predeterminado)
    // O usar el enlace directo de Gmail
    const mailtoUrl = `mailto:${emails}?subject=${subject}&body=${body}`;
    
    // También generar URL directa de Gmail Web
    const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emails)}&su=${subject}&body=${body}`;
    
    return {
      mailtoUrl,
      gmailComposeUrl,
      emails: agentes,
      count: agentes.length
    };
  }

  async approveAllDocuments(propertyId, reviewerId, observation = null) {
    try {
      // Actualizar o insertar el registro en inmueble_revision
      await this._upsertPropertyRevision(propertyId, reviewerId);
      
      // Obtener el título de la propiedad para el correo
      const propertyResult = await query(
        `SELECT titulo FROM inmueble WHERE idinmueble = $1`,
        [propertyId]
      );
      
      const propertyTitle = propertyResult.rows[0]?.titulo || 'Sin título';
      
      // Actualizar el estado de la propiedad a 'activo' y limpiar observación
      await query(
        `UPDATE inmueble SET estado = 'activo', observacion = NULL WHERE idinmueble = $1`,
        [propertyId]
      );
      
      // Generar las URLs para Gmail
      const emailData = await this.generateGmailUrl(propertyId, propertyTitle);
      
      // Retornar la información para que el frontend abra Gmail
      return { 
        success: true,
        emailData: emailData,
        propertyTitle: propertyTitle,
        message: emailData ? `Correo preparado para ${emailData.count} destinatarios` : 'No hay destinatarios disponibles'
      };
      
    } catch (error) {
      console.error("Error in approveAllDocuments:", error);
      throw error;
    }
  }

  async rejectAllDocuments(propertyId, reviewerId, observation) {
    try {
      if (!observation || observation.trim() === "") {
        throw new Error("La observación es requerida para rechazar la propiedad");
      }
      
      await this._upsertPropertyRevision(propertyId, reviewerId);
      
      await query(
        `UPDATE inmueble SET estado = 'observado', observacion = $1 WHERE idinmueble = $2`,
        [observation, propertyId]
      );
      
      return { success: true };
      
    } catch (error) {
      console.error("Error in rejectAllDocuments:", error);
      throw error;
    }
  }
}

module.exports = new DocumentManagementService();