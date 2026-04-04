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

  async approveAllDocuments(propertyId, reviewerId, observation = null) {
    try {
      const checkSql = `SELECT idinmueble_revision FROM inmueble_revision WHERE idinmueble = $1`;
      const checkResult = await query(checkSql, [propertyId]);
      
      if (checkResult.rows.length === 0) {
        await query(
          `INSERT INTO inmueble_revision (idagente, idinmueble, fecha_revision)
           VALUES ($1, $2, NOW())`,
          [reviewerId, propertyId]
        );
      }
      
      const propertyResult = await query(
        `SELECT titulo FROM inmueble WHERE idinmueble = $1`,
        [propertyId]
      );
      
      const propertyTitle = propertyResult.rows[0]?.titulo || 'Sin título';
      
      await query(
        `UPDATE inmueble SET estado = 'activo', observacion = NULL WHERE idinmueble = $1`,
        [propertyId]
      );
      
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
      const checkSql = `SELECT idinmueble_revision FROM inmueble_revision WHERE idinmueble = $1`;
      const checkResult = await query(checkSql, [propertyId]);
      
      if (checkResult.rows.length === 0) {
        await query(
          `INSERT INTO inmueble_revision (idagente, idinmueble, fecha_revision)
           VALUES ($1, $2, NOW())`,
          [reviewerId, propertyId]
        );
      }
      
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