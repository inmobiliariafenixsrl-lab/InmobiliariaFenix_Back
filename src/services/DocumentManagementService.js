const { query } = require("../../db");

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
    
    // Agregar imagen por defecto
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
    
    // Agregar estado basado en la existencia de revisión
    // Como no hay estado en documento, todos se consideran pendientes
    return result.rows.map(doc => ({
      ...doc,
      estado: "pendiente"
    }));
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
    
    // Si no es administrador, solo ve las revisiones que hizo
    if (userRole !== 'administrador') {
      sql += ` WHERE r.idagente = $1`;
      params.push(reviewerId);
    }
    
    sql += ` ORDER BY r.fecha_revision DESC LIMIT 100`;
    
    const result = await query(sql, params);
    
    // Contar documentos para cada propiedad
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

  async submitReview(propertyId, status, observation, reviewerId, documents = null) {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Actualizar estado del inmueble
      const propertyStatus = status === 'aprobado' ? 'activo' : 'observado';
      await client.query(
        `UPDATE inmueble SET estado = $1, observacion = $2 WHERE idinmueble = $3`,
        [propertyStatus, observation || null, propertyId]
      );
      
      // Registrar en historial de revisiones
      await client.query(
        `INSERT INTO inmueble_revision 
         (idagente, idinmueble, fecha_revision)
         VALUES ($1, $2, NOW())`,
        [reviewerId, propertyId]
      );
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async approveAllDocuments(propertyId, reviewerId, observation = null) {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Actualizar estado del inmueble a activo
      await client.query(
        `UPDATE inmueble SET estado = 'activo', observacion = NULL WHERE idinmueble = $1`,
        [propertyId]
      );
      
      // Registrar en historial
      await client.query(
        `INSERT INTO inmueble_revision 
         (idagente, idinmueble, fecha_revision)
         VALUES ($1, $2, NOW())`,
        [reviewerId, propertyId]
      );
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async rejectAllDocuments(propertyId, reviewerId, observation) {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Actualizar estado del inmueble a observado
      await client.query(
        `UPDATE inmueble SET estado = 'observado', observacion = $1 WHERE idinmueble = $2`,
        [observation, propertyId]
      );
      
      // Registrar en historial
      await client.query(
        `INSERT INTO inmueble_revision 
         (idagente, idinmueble, fecha_revision)
         VALUES ($1, $2, NOW())`,
        [reviewerId, propertyId]
      );
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getClient() {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    return await pool.connect();
  }
}

module.exports = new DocumentManagementService();