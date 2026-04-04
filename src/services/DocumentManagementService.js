const { query } = require("../../db");
const emailService = require("./EmailService");

class DocumentManagementService {
  async getPropertiesInReview() {
    const sql = `
      SELECT 
        i.*,
        a.nombre as agente_nombre,
        a.apellido as agente_apellido
      FROM inmueble i
      LEFT JOIN agente a ON i.idagente = a.idagente
      WHERE i.estado = 'en revisión'
      ORDER BY i.fecha_creacion DESC
    `;
    
    const result = await query(sql);
    
    return result.rows.map(property => ({
      ...property,
      imagenes: ["/images/casa.jpg"]
    }));
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
        r.fecha_revision as "reviewedAt",
        CONCAT(a.nombre, ' ', a.apellido) as "reviewedBy",
        a.idagente as "reviewedById",
        i.estado,
        i.observacion as observation
      FROM inmueble_revision r
      INNER JOIN inmueble i ON r.idinmueble = i.idinmueble
      INNER JOIN agente a ON r.idagente = a.idagente
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
        ...row,
        propertyImage: "/images/casa.jpg",
        status: row.estado === 'activo' ? 'aprobado' : 'rechazado',
        documentsReviewed: row.estado === 'activo' ? parseInt(docsCount.rows[0].total) : 0,
        totalDocuments: parseInt(docsCount.rows[0].total)
      };
    }));
    
    return historyWithCounts;
  }

  async approveAllDocuments(propertyId, reviewerId, observation = null) {
    try {
      // Verificar si ya existe en inmueble_revision (NO insertar duplicados)
      const checkSql = `SELECT idinmueble_revision FROM inmueble_revision WHERE idinmueble = $1`;
      const checkResult = await query(checkSql, [propertyId]);
      
      // Solo insertar si NO existe
      if (checkResult.rows.length === 0) {
        await query(
          `INSERT INTO inmueble_revision (idagente, idinmueble, fecha_revision)
           VALUES ($1, $2, NOW())`,
          [reviewerId, propertyId]
        );
      }
      
      // Obtener el título del inmueble antes de actualizar
      const propertyResult = await query(
        `SELECT titulo FROM inmueble WHERE idinmueble = $1`,
        [propertyId]
      );
      
      const propertyTitle = propertyResult.rows[0]?.titulo || 'Sin título';
      
      // Actualizar estado del inmueble a activo
      await query(
        `UPDATE inmueble SET estado = 'activo', observacion = NULL WHERE idinmueble = $1`,
        [propertyId]
      );
      
      // Enviar correo en segundo plano (sin await para no bloquear la respuesta)
      // Esto permite que la aprobación sea inmediata y el correo se envíe en paralelo
      emailService.sendPropertyApprovedEmail(propertyId, propertyTitle)
        .then(result => {
          if (result.success) {
            console.log(`✅ Notificación enviada a ${result.count} agentes para la propiedad: ${propertyTitle}`);
          } else {
            console.log(`⚠️ La propiedad ${propertyTitle} se aprobó pero hubo un problema con el envío de correos: ${result.error}`);
          }
        })
        .catch(error => {
          console.error(`❌ Error enviando notificación para ${propertyTitle}:`, error.message);
        });
      
      return { success: true };
      
    } catch (error) {
      console.error("Error in approveAllDocuments:", error);
      throw error;
    }
  }

  async rejectAllDocuments(propertyId, reviewerId, observation) {
    try {
      // Verificar si ya existe en inmueble_revision (NO insertar duplicados)
      const checkSql = `SELECT idinmueble_revision FROM inmueble_revision WHERE idinmueble = $1`;
      const checkResult = await query(checkSql, [propertyId]);
      
      // Solo insertar si NO existe
      if (checkResult.rows.length === 0) {
        await query(
          `INSERT INTO inmueble_revision (idagente, idinmueble, fecha_revision)
           VALUES ($1, $2, NOW())`,
          [reviewerId, propertyId]
        );
      }
      
      // Actualizar estado del inmueble a observado
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